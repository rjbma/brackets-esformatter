# Brackets esformatter
[Brackets](http://brackets.io/) Extension for formatting JavaScript files using [esformatter](https://github.com/millermedeiros/esformatter) version **0.8.1**.

This is a shameless port of the excelent [brackets-beautify](https://github.com/Hirse/brackets-beautify) that formats files using [js-beautify](https://github.com/beautify-web/js-beautify). I've used it for some time, but never really liked the fact that lines break on every single bracket, even for very short objects, or ES6 import statements. **esformatter** on the other hand seems to have that covered!

# Installation
Unfortunately, I couldn't get the extension uploaded into the [Brackets Extension Registry](https://brackets-registry.aboutweb.com/), so currently it has to be installed manually. 

1. Clone the repository
2. `cd node`
3. `npm install` to install **esformatter** and its dependencies
4. `zip` the whole thing and install using Brackets built-in Extension Manager.

For *nix systems, there's a `build.sh` that should do steps 1 through 3.

# Configuration
The extension uses the tab character and tab size defined in the editor.
Other than that, you can put an `.esformatter` file in the root of your project and the extension will use it. Or else, the extension will use the default configuration file, that can be found under `node/node_modules/esformatter/lib/preset/default.json` from where the extension is installed.
