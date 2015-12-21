define(function(require, exports, module) {
    'use strict';

    var PREFIX = 'rjbma.beautify';
    var COMMAND_ID = PREFIX + '.beautify';
    var COMMAND_SAVE_ID = PREFIX + '.autosave';

    var CommandManager = brackets.getModule('command/CommandManager');
    var Commands = brackets.getModule('command/Commands');
    var Menus = brackets.getModule('command/Menus');
    var DocumentManager = brackets.getModule('document/DocumentManager');
    var Editor = brackets.getModule('editor/Editor').Editor;
    var EditorManager = brackets.getModule('editor/EditorManager');
    var FileSystem = brackets.getModule('filesystem/FileSystem');
    var FileSystemError = brackets.getModule('filesystem/FileSystemError');
    var LanguageManager = brackets.getModule('language/LanguageManager');
    var LiveDevelopment = brackets.getModule('LiveDevelopment/LiveDevelopment');
    var PreferencesManager = brackets.getModule('preferences/PreferencesManager');
    var ProjectManager = brackets.getModule('project/ProjectManager');
    var AppInit = brackets.getModule('utils/AppInit');
    var DefaultDialogs = brackets.getModule('widgets/DefaultDialogs');
    var Dialogs = brackets.getModule('widgets/Dialogs');

    var Strings = require('strings');
    var ExtensionUtils = brackets.getModule("utils/ExtensionUtils");
    var NodeDomain = brackets.getModule("utils/NodeDomain");
    var esfDomain = new NodeDomain("rjbma.esf", ExtensionUtils.getModulePath(module, "node/EsformatterDomain"));

    function esf(text, options) {
        return esfDomain.exec("format", text, options);
    }

    var settingsFileName = '.esformatter';
    var settings = JSON.parse(require('text!node/node_modules/esformatter/lib/preset/default.json'));
    var beautifyPrefs = PreferencesManager.getExtensionPrefs(PREFIX);
    var keyBindings = [
        {
            key: 'Ctrl-Shift-L',
            platform: 'win'
        }, {
            key: 'Ctrl-Alt-B',
            platform: 'win'
        }, {
            key: 'Cmd-Shift-L',
            platform: 'mac'
        }, {
            key: 'Ctrl-Alt-B'
        }
    ];

    var beautifyOnSave = beautifyPrefs.get('onSave') || false;
    if (!beautifyOnSave) {
        beautifyPrefs.set('onSave', false);
        beautifyPrefs.save();
    }

    function batchUpdate(formattedText, range) {
        var editor = EditorManager.getCurrentFullEditor();
        var cursorPos = editor.getCursorPos();
        var scrollPos = editor.getScrollPos();
        var document = DocumentManager.getCurrentDocument();
        document.batchOperation(function() {
            if (range) {
                document.replaceRange(formattedText, range.start, range.end);
            } else {
                document.setText(formattedText);
            }
            editor.setCursorPos(cursorPos);
            editor.setScrollPos(scrollPos.x, scrollPos.y);
        });
    }

    function format(autoSave) {
        // we can only fromat js
        var document = DocumentManager.getCurrentDocument();
        if (['javascript', 'json', 'jsx'].indexOf(document.getLanguage().getId()) === -1) {
            if (!autoSave) {
                Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_ERROR, Strings.UNSUPPORTED_TITLE, Strings.UNSUPPORTED_MESSAGE);
            }
            return;
        }

        // use tab char defined in brackets
        var editor = EditorManager.getCurrentFullEditor();
        var options = $.extend({}, settings);
        var tabChar = Editor.getUseTabChar() ? '\t' : ' ';
        options.indent.value = Array(Editor.getSpaceUnits() + 1).join(tabChar);

        // format select or whole document?
        var range, unformattedText;
        if (editor.hasSelection()) {
            unformattedText = editor.getSelectedText();
            range = editor.getSelection();
        } else {
            unformattedText = document.getText();
        }

        var originalText = unformattedText;
        var isJson = document.getLanguage().getId() === 'json';
        if (isJson) {
            // seems esformatter doesn't format json
            // but if we wrap it with round brackets, it seem to work
            unformattedText = '(' + unformattedText + ')';
        }

        return esf(unformattedText, options)
            .done(function(formattedText) {
                // strip round brackets from json
                if (isJson) {
                    var si = formattedText.indexOf('(');
                    var fi = formattedText.lastIndexOf(')');
                    if (si !== -1 && fi !== -1) {
                        formattedText = formattedText.substring(0, si) + formattedText.substring(si + 1, fi) + formattedText.substring(fi + 1);
                    } else {
                        // seems that formatting removed wrapping round brackets...
                        // it's probably better to do no formatting at all
                        formattedText = originalText;
                    }
                }

                if (formattedText !== originalText) {
                    batchUpdate(formattedText, range);
                }
            })
            .fail(function(err) {
                // some error occurred, most likely the file content is invalid
                // perhaps it would be better to fail silently without modifying the file?
                Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_ERROR, Strings.ERROR_FORMATTING, err);
            });
    }

    function onSave(event, doc) {
        if (doc.__beautifySaving) {
            return;
        }
        var context = PreferencesManager._buildContext(doc.file.fullPath, doc.getLanguage().getId());
        if (beautifyPrefs.get('onSave', context)) {
            doc.addRef();
            doc.__beautifySaving = true;

            // format the text. formatting is asynchronous, so we're chaining actions using promises
            format(true)
                .done(function() {
                    // formatting finished, so we can now save the file
                    return CommandManager.execute(Commands.FILE_SAVE, {
                        doc: doc
                    });
                })
                .always(function() {
                    // everything's finished, release the file 
                    delete doc.__beautifySaving;
                    doc.releaseRef();
                });
        }
    }

    function loadConfig(settingsFile) {
        if (!settingsFile) {
            settingsFile = FileSystem.getFileForPath(ProjectManager.getProjectRoot().fullPath + settingsFileName);
        }
        settingsFile.read(function(err, content) {
            if (err === FileSystemError.NOT_FOUND) {
                return;
            }
            try {
                // always user defaults as base 
                settings = $.extend({}, settings, JSON.parse(content));
            } catch (e) {
                console.error('Brackets Esformatter - Error parsing options (' + settingsFile.fullPath + '). Using default.');
                return;
            }
        });
    }

    function loadConfigOnChange(e, document) {
        if (document.file.fullPath === ProjectManager.getProjectRoot().fullPath + settingsFileName) {
            loadConfig(document.file);
        }
    }

    function toggle(command, fromCheckbox) {
        var newValue = (typeof fromCheckbox === 'undefined') ? beautifyOnSave : fromCheckbox;
        DocumentManager[newValue ? 'on' : 'off']('documentSaved', onSave);
        command.setChecked(newValue);
        beautifyPrefs.set('onSave', newValue);
        beautifyPrefs.save();
    }

    CommandManager.register(Strings.FORMAT, COMMAND_ID, format);
    var commandOnSave = CommandManager.register(Strings.FORMAT_ON_SAVE, COMMAND_SAVE_ID, function() {
        toggle(this, !this.getChecked());
    });
    toggle(commandOnSave);

    var editMenu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);
    editMenu.addMenuDivider();
    editMenu.addMenuItem(COMMAND_ID, keyBindings);
    editMenu.addMenuItem(COMMAND_SAVE_ID);
    Menus.getContextMenu(Menus.ContextMenuIds.EDITOR_MENU).addMenuItem(COMMAND_ID);

    var jsonLanguage = LanguageManager.getLanguage('json');
    jsonLanguage.addFileExtension(settingsFileName);
    jsonLanguage.addFileName(settingsFileName);

    AppInit.appReady(function() {
        // reload configuration if config file is modifed inside brackets
        DocumentManager.on('documentSaved.beautify', loadConfigOnChange);
        // reload configuration if config file is reloaded form disk
        DocumentManager.on('documentRefreshed.beautify', loadConfigOnChange);
        // load the configuration when the user opens a project
        ProjectManager.on('projectOpen.beautify', function() {
            loadConfig();
        });
        loadConfig();
    });
});
