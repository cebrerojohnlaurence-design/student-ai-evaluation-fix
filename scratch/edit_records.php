<?php
$f = 'd:\practice\practice\ai-driven\public\js\admin\records.js';
$content = file_get_contents($f);
$lines = explode("\n", $content);
$lines[2497] = "    if (currentUser.role === 'teacher' && currentRecordSection === 'all') {";
file_put_contents($f, implode("\n", $lines));
echo "Done replacing line 2498 (index 2497)\n";
