import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import { mkdirP } from '@actions/io';

import { compiler, legacyDub } from './compiler';

async function run() {
    try {
        if (process.arch != "x64")
            throw new Error("Only x64 arch is supported by all platforms");

        const input = core.getInput('compiler') || "dmd-latest";
        const descr = await compiler(input);

        console.log(`Enabling ${input}`);

        const cache_tag = descr.name + "-" + descr.version + (descr.download_dub ? "+dub" : "");

        let cached = tc.find('dc', cache_tag);

        if (cached) {
            console.log("Using cache");
        }
        else {
            console.log(`Downloading ${descr.url}`);
            const archive = await tc.downloadTool(descr.url);
            const dc_path = await extract(descr.url, archive);

            if (descr.download_dub) {
                const dub = await legacyDub();
                const archive2 = await tc.downloadTool(dub.url);
                await extract(dub.url, archive2, dc_path + descr.binpath);
            }

            cached = await tc.cacheDir(dc_path, 'dc', cache_tag);
        }

        core.addPath(cached + descr.binpath);
        core.exportVariable("DC", descr.name);
        console.log("Done");
    } catch (error) {
        core.setFailed(error.message);
    }
}

async function extract(format: string, archive: string, into?: string) {
    if (format.endsWith(".7z"))
        return await tc.extract7z(archive, into);
    else if (format.endsWith(".zip"))
        return await tc.extractZip(archive, into);
    else if (/\.tar(\.\w+)?$/.test(format))
        return await tc.extractTar(archive, into, 'x');

    throw new Error("unsupported archive format: " + format);
}

run();
