
/// <reference path='typings/node/node.d.ts'/>
/// <reference path='typings/through2/through2.d.ts'/>
/// <reference path='typings/gulp-util/gulp-util.d.ts'/>

import * as fs from 'fs';
import * as path from 'path';
import through = require('through2');
import * as gutil from 'gulp-util';

let PluginError = gutil.PluginError;

const PLUGIN_NAME = 'gulp-generate-ts-diagnostics';

interface MessageProperty {
    name: string;
    type: string;
    optional?: boolean;
}

export = function(props: MessageProperty[]) {
    if (!props || props.length === 0) {
        throw new PluginError(PLUGIN_NAME, 'Missing properties argument');
    }

    let stream = through.obj(function(file, encoding, next) {
        let json = JSON.parse(file.contents);
        let length = Object.keys(json).length;
        let index = 0;

        let diagnosticsText = '\n';
        diagnosticsText += 'export interface DiagnosticMessage {\n';
        diagnosticsText += '    message: string;\n';
        for (let i in props) {
            // Don't treat message.
            if (props[i].name === 'message') {
                props.splice(i, 1);
                continue;
            }
            diagnosticsText += `    ${props[i].name + (props[i].optional ? '?' : '')}: ${props[i].type};\n`;
        }
        diagnosticsText += '}\n\n';


        diagnosticsText += 'export var Diagnostics = {\n';
        for (let message in json) {
            diagnosticsText += '    ' +
                message.replace(/\s+/g, '_')
                    .replace(/['"\.,\(\)\-]/g, '')
                    .replace(/\+/g, 'plus')
                    .replace(/\{(\d)\}/g, '$1');

            diagnosticsText += ': {\n';
            diagnosticsText += '        message: \'' + message.replace(/(['])/g, '\\$1') + '\',\n';
            for (let prop of props) {
                if (json[message].type === 'number') {
                    diagnosticsText += `        ${prop.name}: ${json[message][prop.name]},\n`;
                }
                else {
                    diagnosticsText += `        ${prop.name}: '${json[message][prop.name]}',\n`;
                }
            }
            diagnosticsText += '    },\n';
            index++;
        }
        diagnosticsText += '}\n\n';

        diagnosticsText += 'export default Diagnostics;\n';

        file.contents = Buffer.concat([new Buffer(diagnosticsText)]);

        this.push(file);

        next();
    });

    return stream;
}