#!/bin/bash

rm -rf node_modules
npm install --production

rm -f SHA256SUMS
sha256sum package.json *.js LICENSE > SHA256SUMS
find node_modules -type f -exec sha256sum {} \; >> SHA256SUMS
npm pack
