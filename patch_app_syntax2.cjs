const fs = require('fs');
const file = 'd:/practice/practice/ai-driven/public/js/app.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `            }
    } catch (e) {
        console.error('Failed to fetch settings', e);
    }
}`;

const newStr = `            }
        }
    } catch (e) {
        console.error('Failed to fetch settings', e);
    }
}`;

// normalize CRLF
const contentNormalized = content.replace(/\r\n/g, '\n');
const targetStrNormalized = targetStr.replace(/\r\n/g, '\n');
const newStrNormalized = newStr.replace(/\r\n/g, '\n');

if (contentNormalized.includes(targetStrNormalized)) {
    content = contentNormalized.replace(targetStrNormalized, newStrNormalized);
    fs.writeFileSync(file, content);
    console.log("Replaced using exact string match!");
} else {
    console.log("Could not find the target string.");
}
