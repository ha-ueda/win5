// worker.js
const TOTAL_RACES = 5;
const HORSE_MAX = 18;

onmessage = function (e) {
    const { type, chunkMasks, favMaskList, nonFavMaskList, colorArray, mergeLimit } = e.data;
    if (type !== 'run') return;

    function isColorDuplicate(combo) {
        const used = new Set();
        for (let i = 0; i < combo.length; i++) {
            const idx = (Math.log2(combo[i]) | 0) + 1;
            const c = colorArray[i][idx];
            if (c && c !== "none") {
                if (used.has(c)) return true;
                used.add(c);
            }
        }
        return false;
    }

    function countCombos(candidates, limit, allowStore) {
        const n = candidates.length;
        const sizes = candidates.map(a => a.length);
        const idx = new Array(n).fill(0);
        let count = 0;
        const blocks = [];

        while (true) {
            const combo = new Array(n);
            for (let i = 0; i < n; i++) combo[i] = candidates[i][idx[i]];
            if (!isColorDuplicate(combo)) {
                count++;
                if (allowStore && count <= limit) {
                    const s = new Int32Array(n);
                    for (let i = 0; i < n; i++) s[i] = combo[i];
                    blocks.push(s);
                } else if (count > limit) return { count, blocks: [], overLimit: true };
            }
            let j = n - 1;
            while (j >= 0 && ++idx[j] === sizes[j]) idx[j--] = 0;
            if (j < 0) break;
        }
        return { count, blocks, overLimit: false };
    }

    let count = 0;
    let blocks = [];
    let overLimit = false;

    for (let m = 0; m < chunkMasks.length; m++) {
        const maskArr = chunkMasks[m];
        const maskSet = new Set(maskArr);
        const candidates = new Array(TOTAL_RACES);
        let valid = true;
        for (let i = 0; i < TOTAL_RACES; i++) {
            candidates[i] = maskSet.has(i) ? favMaskList[i] : nonFavMaskList[i];
            if (candidates[i].length === 0) { valid = false; break; }
        }
        if (!valid) continue;
        const res = countCombos(candidates, mergeLimit, !overLimit);
        count += res.count;
        if (res.overLimit || count > mergeLimit) { overLimit = true; blocks = []; break; }
        else blocks.push(...res.blocks);
    }

    postMessage({ count, blocks, overLimit });
};
