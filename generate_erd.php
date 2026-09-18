<?php

$tables = [
    'users' => [
        'cols' => ['id PK', 'username', 'password', 'role', 'status', 'created_at'],
        'x' => 50, 'y' => 50
    ],
    'activity_logs' => [
        'cols' => ['id PK', 'user_id FK', 'action', 'description', 'created_at'],
        'x' => 350, 'y' => 50
    ],
    'principals' => [
        'cols' => ['id PK', 'user_id FK', 'employee_id', 'first_name', 'last_name'],
        'x' => 650, 'y' => 50
    ],
    'coordinators' => [
        'cols' => ['id PK', 'user_id FK', 'employee_id', 'first_name', 'last_name', 'department'],
        'x' => 950, 'y' => 50
    ],
    'students' => [
        'cols' => ['id PK', 'user_id FK', 'lrn', 'first_name', 'last_name', 'middle_initial', 'gender', 'birth_date'],
        'x' => 50, 'y' => 350
    ],
    'teachers' => [
        'cols' => ['id PK', 'user_id FK', 'employee_id', 'first_name', 'last_name', 'department', 'is_adviser'],
        'x' => 350, 'y' => 350
    ],
    'subjects' => [
        'cols' => ['id PK', 'code', 'name', 'grade_level', 'type'],
        'x' => 650, 'y' => 350
    ],
    'ai_predictions' => [
        'cols' => ['id PK', 'student_id FK', 'risk_level', 'factors', 'recommendation', 'generated_at'],
        'x' => 950, 'y' => 350
    ],
    'enrollments' => [
        'cols' => ['id PK', 'student_id FK', 'section_id FK', 'school_year', 'status'],
        'x' => 50, 'y' => 680
    ],
    'sections' => [
        'cols' => ['id PK', 'name', 'grade_level', 'school_year', 'adviser_id FK'],
        'x' => 350, 'y' => 680
    ],
    'section_subjects' => [
        'cols' => ['id PK', 'section_id FK', 'subject_id FK', 'teacher_id FK'],
        'x' => 650, 'y' => 680
    ],
    'attendances' => [
        'cols' => ['id PK', 'student_id FK', 'section_id FK', 'date', 'status'],
        'x' => 50, 'y' => 950
    ],
    'grades' => [
        'cols' => ['id PK', 'student_id FK', 'subject_id FK', 'section_id FK', 'quarter', 'written_score', 'performance_score', 'assessment_score', 'final_grade'],
        'x' => 350, 'y' => 950
    ]
];

$xml = '<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="2024-01-01T00:00:00.000Z" agent="Mozilla/5.0" version="21.5.0" type="device">
  <diagram id="R2lEEEUBdFMjLlhIrx00" name="ERD">
    <mxGraphModel dx="1422" dy="798" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1400" pageHeight="1400" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />';

$col_map = [];

foreach ($tables as $tname => $tdata) {
    $table_id = "table_" . $tname;
    $h = count($tdata['cols']) * 30 + 30;
    
    $xml .= '
        <mxCell id="'.$table_id.'" value="'.strtoupper($tname).'" style="shape=table;startSize=30;container=1;collapsible=1;childLayout=tableLayout;fixedRows=1;rowLines=0;fontStyle=1;align=center;" vertex="1" parent="1">
          <mxGeometry x="'.$tdata['x'].'" y="'.$tdata['y'].'" width="220" height="'.$h.'" as="geometry" />
        </mxCell>';
        
    $y = 30;
    foreach ($tdata['cols'] as $col) {
        $row_id = $table_id . "_r_" . $y;
        $parts = explode(' ', $col);
        $cname = $parts[0];
        $ctype = isset($parts[1]) ? $parts[1] : '';
        
        $col_map[$tname . '.' . $cname] = $row_id;
        
        $xml .= '
        <mxCell id="'.$row_id.'" value="" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;top=0;left=0;bottom=0;right=0;collapsible=0;dropTarget=0;fillColor=none;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;" vertex="1" parent="'.$table_id.'">
          <mxGeometry y="'.$y.'" width="220" height="30" as="geometry" />
        </mxCell>';
        
        $xml .= '
        <mxCell id="'.$row_id.'_c1" value="'.$ctype.'" style="shape=partialRectangle;html=1;whiteSpace=wrap;connectable=0;fillColor=none;top=0;left=0;bottom=0;right=0;overflow=hidden;fontStyle=1;" vertex="1" parent="'.$row_id.'">
          <mxGeometry width="40" height="30" as="geometry" />
        </mxCell>
        <mxCell id="'.$row_id.'_c2" value="'.$cname.'" style="shape=partialRectangle;html=1;whiteSpace=wrap;connectable=0;fillColor=none;top=0;left=0;bottom=0;right=0;align=left;spacingLeft=6;overflow=hidden;" vertex="1" parent="'.$row_id.'">
          <mxGeometry x="40" width="180" height="30" as="geometry" />
        </mxCell>';
        $y += 30;
    }
}

// Map FK to PK
$connections = [
    ['activity_logs.user_id', 'users.id'],
    ['principals.user_id', 'users.id'],
    ['coordinators.user_id', 'users.id'],
    ['students.user_id', 'users.id'],
    ['teachers.user_id', 'users.id'],
    ['sections.adviser_id', 'teachers.id'],
    ['section_subjects.section_id', 'sections.id'],
    ['section_subjects.subject_id', 'subjects.id'],
    ['section_subjects.teacher_id', 'teachers.id'],
    ['enrollments.student_id', 'students.id'],
    ['enrollments.section_id', 'sections.id'],
    ['attendances.student_id', 'students.id'],
    ['attendances.section_id', 'sections.id'],
    ['grades.student_id', 'students.id'],
    ['grades.section_id', 'sections.id'],
    ['grades.subject_id', 'subjects.id'],
    ['ai_predictions.student_id', 'students.id']
];

foreach ($connections as $i => $conn) {
    $edge_id = "edge_" . $i;
    $src = $col_map[$conn[0]];
    $tgt = $col_map[$conn[1]];
    
    // Use orthogonalEdgeStyle for neat right-angled lines
    $xml .= '
        <mxCell id="'.$edge_id.'" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=ERmandOne;startArrow=ERzeroToMany;" edge="1" parent="1" source="'.$src.'" target="'.$tgt.'">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>';
}

$xml .= '
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>';

file_put_contents('D:\practice\practice\ai-driven\new_system_erd.drawio', $xml);
echo "DONE\n";
