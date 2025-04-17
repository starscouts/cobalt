/*
 * MIT License
 *
 * Copyright (c) 2022- Minteck
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

global.version = "1.3";

const YAML = require('yaml');
const ejs = require('ejs');

const fs = require('fs');
const path = require('path');
const md = require('markdown-it')("commonmark", {
    html: true,
    linkify: true,
    typographer: true
});

const uniqueid = require('./modules/uniqueid');
const containsPublishTag = require('./modules/publishtag');
const removeFromSitemap = require('./modules/removesm');

if (!fs.existsSync("./config.yml")) fs.copyFileSync("./config.default.yml", "./config.yml");
if (!fs.existsSync("./data")) fs.mkdirSync("./data");

if (fs.readdirSync("./data").length < 1) {
    console.log("Your data folder is empty, add at least one Markdown file and start the rendering process again.");
    process.exit(1);
}

global.config = YAML.parse(fs.readFileSync("./config.yml").toString());
global.config._version = global.version;

global.files = [];
global.directories = [];
global.sitemap = "";

global.afiles = [];
global.adirectories = [];
global.asitemap = "";
global.sitemaps = {};

function analyze(dir, levels) {
    let dfiles = fs.readdirSync(dir);

    for (let file of dfiles) {
        if (fs.lstatSync(dir + "/" + file).isDirectory()) {
            id = uniqueid(dir + "/" + file)
            directories.push({
                source: dir + "/" + file,
                dest: "./output/" + id,
                name: file,
                id
            })
            sitemap = sitemap + "\n" + "  ".repeat(levels - 1) + "* [" + file + "](./" + id + "/index.html)";
            analyze(dir + "/" + file, levels + 1);
        } else if (file.endsWith(".md")) {
            if (!config.conditional_publishing || containsPublishTag(dir + "/" + file)) {
                if (path.basename(file) === "index.md") {
                    if (dir === "./data") {
                        id = uniqueid(dir + "/" + file)
                        files.push({
                            source: dir + "/" + file,
                            dest: "./output/index.html",
                            name: file,
                            id,
                            parent: {
                                path: "./index.html",
                                name: "index"
                            }
                        })
                    } else {
                        id = uniqueid(dir + "/" + file)
                        files.push({
                            source: dir + "/" + file,
                            dest: "./output/" + uniqueid(path.dirname(dir + "/" + file)) + "/index.html",
                            name: file,
                            id,
                            parent: {
                                path: "./index.html",
                                name: "index"
                            }
                        })
                    }
                } else {
                    id = uniqueid(dir + "/" + file)
                    files.push({
                        source: dir + "/" + file,
                        dest: "./output/" + uniqueid(path.dirname(dir + "/" + file)) + "/" + id + ".html",
                        name: file,
                        id,
                        parent: {
                            path: "./" + uniqueid(path.dirname(dir + "/" + file)) + "/index.html",
                            name: path.basename(path.dirname(dir + "/" + file))
                        }
                    })
                    sitemap = sitemap + "\n" + "  ".repeat(levels - 1) + "* [" + file.substring(0, file.length - 3) + "](./" + uniqueid(path.dirname(dir + "/" + file)) + "/" + id + ".html)";
                }
            }
        }
    }
}

function aanalyze(dir, levels) {
    let dfiles = fs.readdirSync(dir);

    for (let file of dfiles) {
        if (fs.lstatSync(dir + "/" + file).isDirectory()) {
            id = uniqueid(dir + "/" + file)
            adirectories.push({
                source: dir + "/" + file,
                dest: "./output/" + id,
                name: file,
                id
            })
            asitemap = asitemap + "\n" + "  ".repeat(levels - 1) + "* [" + file + "](../" + id + "/index.html)";
            aanalyze(dir + "/" + file, levels + 1);
        } else if (file.endsWith(".md")) {
            if (!config.conditional_publishing || containsPublishTag(dir + "/" + file)) {
                if (path.basename(file) === "index.md") {
                    id = uniqueid(dir + "/" + file)
                    afiles.push({
                        source: dir + "/" + file,
                        dest: "./output/" + uniqueid(path.dirname(dir + "/" + file)) + "/index.html",
                        name: file,
                        id,
                        parent: {
                            path: "./index.html",
                            name: "index"
                        }
                    })
                } else {
                    id = uniqueid(dir + "/" + file)
                    afiles.push({
                        source: dir + "/" + file,
                        dest: "./output/" + uniqueid(path.dirname(dir + "/" + file)) + "/" + id + ".html",
                        name: file,
                        id,
                        parent: {
                            path: "./" + uniqueid(path.dirname(dir + "/" + file)) + "/index.html",
                            name: path.basename(path.dirname(dir + "/" + file))
                        }
                    })
                    asitemap = asitemap + "\n" + "  ".repeat(levels - 1) + "* [" + file.substring(0, file.length - 3) + "](../" + uniqueid(path.dirname(dir + "/" + file)) + "/" + id + ".html)";
                }
            }
        }
    }
}

console.log("Preparing output directory...");

if (fs.existsSync("./output")) fs.rmSync("./output", { recursive: true });
fs.mkdirSync("./output");

if (fs.existsSync("./cache")) fs.rmSync("./cache", { recursive: true });
fs.mkdirSync("./cache");

console.log("Analyzing...");
analyze("./data", 1);

fs.writeFileSync("./cache/map.json", JSON.stringify({
    files,
    directories
}, false, 4));

fs.writeFileSync("./cache/navigation.md", sitemap);

console.log("Creating required directories...");
for (let dir of directories) {
    fs.mkdirSync(dir.dest);
}

console.log("Loading templates...");
header = fs.readFileSync("./templates/header.ejs").toString();
footer = fs.readFileSync("./templates/footer.ejs").toString();

console.log("Generating sitemaps for every directory...");
for (let dir of directories) {
    global.afiles = [];
    global.adirectories = [];
    global.asitemap = "";
    aanalyze(dir.source, 1);
    fs.writeFileSync("./cache/navigation-" + uniqueid(dir.source) + ".md", asitemap);
    fs.writeFileSync("./cache/map-" + uniqueid(dir.source) + ".json", JSON.stringify({
        afiles,
        adirectories
    }, false, 4));
    sitemaps[uniqueid(dir.source)] = asitemap;
}

console.log("Rendering pages...");
for (let page of files) {
    content = md.render(fs.readFileSync(page.source).toString().replace(/---\n((.|\n)*)\n---/gm, "").trim());
    if (!fs.existsSync(path.dirname(page.dest))) fs.mkdirSync(path.dirname(page.dest));
    fs.writeFileSync(page.dest, ejs.render(header, {config, name: page.name}) + "<header class=\"" + config.classes.header.join(" ") + "\"><a href=\"." + page.parent.path + "\">« " + page.parent.name + "</a><hr></header><article class=\"" + config.classes.article.join(" ") + "\">" + content + "</article>" + ejs.render(footer, {config, name: page.name}));
}

console.log("Generating home page...");
if (fs.existsSync("./data/index.md")) {
    content = md.render(fs.readFileSync("./data/index.md").toString().replace(/---\n((.|\n)*)\n---/gm, "").trim()) + "<hr>";
} else {
    content = "";
}
fs.writeFileSync("./output/index.html", ejs.render(header, {config, name: "Home"}) + "<header class=\"" + config.classes.header.join(" ") + "\">Home<hr></header><article class=\"" + config.classes.article.join(" ") + "\">" + content + md.render(sitemap) + "</article>" + ejs.render(footer, {config, name: "Home"}));

console.log("Generating missing index files...");
for (let dir of directories) {
    if (!fs.existsSync(dir.dest + "/index.html")) {
        if (sitemaps[dir.id].trim() !== "") {
            fs.writeFileSync(dir.dest + "/index.html", ejs.render(header, {config, name: dir.name}) + "<header class=\"" + config.classes.header.join(" ") + "\"><a href=\"../index.html\">« index</a><hr></header><article class=\"" + config.classes.article.join(" ") + "\">" + md.render(sitemaps[dir.id]) + "</article>" + ejs.render(footer, {config, name: dir.name}));
        } else {
            removeFromSitemap(dir.id);
            console.log("Generating home page...");
            if (fs.existsSync("./data/index.md")) {
                content = md.render(fs.readFileSync("./data/index.md").toString().replace(/---\n((.|\n)*)\n---/gm, "").trim()) + "<hr>";
            } else {
                content = "";
            }
            fs.writeFileSync("./output/index.html", ejs.render(header, {config, name: "Home"}) + "<header class=\"" + config.classes.header.join(" ") + "\">Home<hr></header><article class=\"" + config.classes.article.join(" ") + "\">" + content + md.render(sitemap) + "</article>" + ejs.render(footer, {config, name: "Home"}));
            fs.writeFileSync(dir.dest + "/index.html", ejs.render(header, {config, name: dir.name}) + "<header class=\"" + config.classes.header.join(" ") + "\"><a href=\"../index.html\">« index</a><hr></header><article class=\"" + config.classes.article.join(" ") + "\"><p><i>This folder is empty</i></p></article>" + ejs.render(footer, {config, name: dir.name}));
        }
    } else {
        if (sitemaps[dir.id].trim() !== "") {
            fs.writeFileSync(dir.dest + "/index.html", ejs.render(header, {config, name: dir.name}) + "<header class=\"" + config.classes.header.join(" ") + "\"><a href=\"../index.html\">« index</a><hr></header><article class=\"" + config.classes.article.join(" ") + "\">" + md.render(fs.readFileSync(dir.source + "/index.md").toString().replace(/---\n((.|\n)*)\n---/gm, "").trim()) + "<hr>" + md.render(sitemaps[dir.id]) + "</article>" + ejs.render(footer, {config, name: dir.name}));
        }
    }
}