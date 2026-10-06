<?php
$f = 'd:\practice\practice\ai-driven\public\js\admin\records.js';
$c = file_get_contents($f);
$c = preg_replace('/(\/\/ Subject-based discovery.*?    \}\n        \})/s', '// Subject-based discovery removed', $c);
file_put_contents($f, $c);
echo "Replaced.";
