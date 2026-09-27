// Fungsi untuk memisahkan JSON bersih dari log stdout
function extractJSONFromCLIOutput(stdout) {
    const lines = stdout.split('\n');
    let jsonLines = [];
    let isJson = false;

    for (const line of lines) {
        if (line.trim().startsWith('{')) {
            isJson = true;
        }
        if (isJson) {
            jsonLines.push(line);
        }
    }

    try {
        if (jsonLines.length === 0) return null;
        return JSON.parse(jsonLines.join('\n'));
    } catch (e) {
        return null;
    }
}
module.exports = { extractJSONFromCLIOutput };
