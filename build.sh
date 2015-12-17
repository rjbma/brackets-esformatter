#!/bin/bash

rm -f brackets-esformatter.zip

# install dependencies
(cd node && npm install)

# build the zip file
# git archive --format zip -o brackets-esformatter.zip master
zip -r brackets-esformatter.zip *

# publish zip in https://brackets-registry.aboutweb.com/
