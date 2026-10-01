const fs = require('fs');
let appJs = fs.readFileSync('public/js/app.js', 'utf8');

const routeMapTarget = `'assign-section': 'assign-section',`;
const routeMapRep = `'assign-section': 'assign-section',
            'enrollment': 'enrollment',`;
appJs = appJs.replace(routeMapTarget, routeMapRep);

const renderTarget = `case 'assign-section': renderAssignSection(area); break;`;
const renderRep = `case 'assign-section': renderAssignSection(area); break;
            case 'enrollment': if(typeof renderEnrollment === 'function') renderEnrollment(area); break;`;
appJs = appJs.replace(renderTarget, renderRep);

fs.writeFileSync('public/js/app.js', appJs);

let mainBlade = fs.readFileSync('resources/views/dash/main.blade.php', 'utf8');
const scriptTarget = `<script src="{{ asset('js/admin/dashboard.js') }}"></script>`;
const scriptRep = `<script src="{{ asset('js/admin/dashboard.js') }}"></script>
    <script src="{{ asset('js/admin/enrollment.js') }}"></script>`;
mainBlade = mainBlade.replace(scriptTarget, scriptRep);

fs.writeFileSync('resources/views/dash/main.blade.php', mainBlade);
console.log("Updated app.js and main.blade.php");
