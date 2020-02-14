#!/usr/bin/env node
const fs = require('fs-extra');
const chalk = require('chalk');
const argv = require('yargs').argv;
const path = require('path');
const currentWorkingDir = process.cwd().replace(/[\\]/g, '/');
const rootDir = __dirname.replace(/[\\]/g, '/');
const jsonOutputPath = argv.jsonfile;
const reportOutputPath = argv.output || `ng-lint-report`;
const outputFileName = argv.filename || 'report.html';

if (typeof jsonOutputPath === 'string') {
    const htmlTemplate = fs.readFileSync(`${rootDir}/src/index.html`, 'utf8');
    try {
        let jsonOutput = JSON.parse(fs.readFileSync(path.join(currentWorkingDir, jsonOutputPath), 'utf8'));
        // Process JSON
        if (Array.isArray(jsonOutput)) {
            const jsonMap = {};
            jsonOutput.forEach(item => {
                const baseItemName = path.basename(item.name);
                if (!jsonMap[baseItemName]) {
                    jsonMap[baseItemName] = [];
                }
                jsonMap[baseItemName].push({
                    path: item.name,
                    rule: item.ruleName,
                    type: item.ruleSeverity,
                    position: `${item.startPosition.line}:${item.startPosition.character}`
                });
            });
            jsonOutput = null;
            // Render output
            let html = '';
            Object.keys(jsonMap).forEach(filename => {
                html += `<button class="file-name clearfix">${filename} <em class="float-right">(${jsonMap[filename].length} issue(s) found) <span>+</span></em></button>`;
                html += `<div class="result-wrap">
                <ul><li class="item-head"><span>Path</span><span>Rule</span><span>Error</span><span>Position</span></li>${jsonMap[filename].map(item => {
                    return `<li class="item is-${item.type.toLowerCase()}">
                    <span class="item-cell path">${item.path}</span>
                    <span class="item-cell rule">${item.rule}</span>
                    <span class="item-cell type">${item.type}</span>
                    <span class="item-cell position">${item.position}</span>
                    </li>`;
                }).join('')}</ul>
                </div>`;
            });
            const outputFolders = path.join(currentWorkingDir, reportOutputPath);
            if (!fs.existsSync(outputFolders))
                fs.mkdirsSync(outputFolders);
            fs.writeFileSync(path.join(outputFolders, outputFileName), htmlTemplate.replace('#{placeholder}', `<div class="result-outer-wrap">${html}</div>`));
        } else {
            throw new Error('JSON format is not valid');
        }
    } catch (e) {
        console.log(chalk.bold(chalk.red('Invalid JSON or error in processing')));
        console.log(chalk.red(e.message));
    }
} else {
    console.log(chalk.bold(chalk.red('Please provide a valid JSON path')));
}