(function() {
    "use strict";

    var os = require("os");
    var esf = require('esformatter');

    /**
     * Command that formats text using esformatter
     * @param   {[[Type]]} text    [[Description]]
     * @param   {[[Type]]} options [[Description]]
     * @returns {[[Type]]} [[Description]]
     */
    function cmdFormat(text, options) {
        return esf.format(text, options);
    }

    /**
     * Initializes the test domain with several test commands.
     * @param {DomainManager} domainManager The DomainManager for the server
     */
    function init(domainManager) {
        if (!domainManager.hasDomain("rjbma.esf")) {
            domainManager.registerDomain("rjbma.esf", {
                major: 0,
                minor: 1
            });
        }
        domainManager.registerCommand(
            "rjbma.esf", // domain name
            "format", // command name
            cmdFormat, // command handler function
            false, // this command is synchronous in Node
            "Formats some javascript using esformatter",
            [{
                name: "text", // parameters
                type: "string",
                description: "The unformatted javascript source"
            }],
            [{
                name: "formattedText", // return values
                type: "string",
                description: "Formatted javascript source"
            }]
        );
    }

    exports.init = init;

}());
