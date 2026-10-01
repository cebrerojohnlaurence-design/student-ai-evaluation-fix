const fs = require('fs');
let mainBlade = fs.readFileSync('resources/views/dash/main.blade.php', 'utf8');

const target1 = `document.getElementById("nav-assign-section")?.classList.remove("hidden");`;
const rep1 = `document.getElementById("nav-assign-section")?.classList.remove("hidden");
                document.getElementById("nav-enrollment")?.classList.remove("hidden");`;

mainBlade = mainBlade.replace(new RegExp(target1.replace(/[.*+?^$|{}()[\\]\\\\]/g, '\\\\$&'), 'g'), rep1);

fs.writeFileSync('resources/views/dash/main.blade.php', mainBlade);
console.log("Updated nav-enrollment visibility in main.blade.php");
