const fs = require('fs');
const file = 'd:/practice/practice/ai-driven/public/js/admin/dashboard.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix onGlobalDashFilterChange
content = content.replace(/renderDashboard\(\);/g, "renderDashboard(document.getElementById('content-area'));");

// 2. Fix renderDashboard to default area
content = content.replace(/function renderDashboard\(area\) \{/, "function renderDashboard(area) {\n    if (!area) area = document.getElementById('content-area');\n    if (!area) return;");

// 3. Remove the global filters from the top Overview section
const overviewHtmlRegex = /<div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 animate-fade-in">\s*<h2 class="text-2xl font-bold text-gray-800 tracking-tight">Overview<\/h2>[\s\S]*?<\/div>\s*<\/div>/;
const newOverviewHtml = `<div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 animate-fade-in">
            <h2 class="text-2xl font-bold text-gray-800 tracking-tight">Overview</h2>
        </div>`;
content = content.replace(overviewHtmlRegex, newOverviewHtml);

// 4. Put the dropdowns back in AI Insight, styled nicer
const aiInsightHtmlRegex = /<h3 class="text-xs font-bold text-gray-800 uppercase tracking-widest"><i class="fas fa-brain text-primary mr-2"><\/i>AI Insight<\/h3>[\s\S]*?<button onclick="generateDashboardInsights\(\)"/;
const newAiInsightHtml = `<h3 class="text-xs font-bold text-gray-800 uppercase tracking-widest"><i class="fas fa-brain text-primary mr-2"></i>AI Insight</h3>
                    <div class="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-100">
                        <i class="fas fa-filter text-gray-400 text-[10px] ml-1"></i>
                        <select id="global-dash-grade" onchange="onGlobalDashFilterChange(this, 'grade')" class="text-[10px] bg-transparent outline-none pr-2 py-1 font-bold text-gray-600 cursor-pointer">
                            <option value="All">All Grades</option>
                        </select>
                        <select id="global-dash-section" onchange="onGlobalDashFilterChange(this, 'section')" class="text-[10px] bg-white border border-gray-200 outline-none px-2 py-1 rounded shadow-sm font-bold text-gray-600 cursor-pointer">
                            <option value="All">All Sections</option>
                        </select>
                    </div>
                    <button onclick="generateDashboardInsights()"`;
content = content.replace(aiInsightHtmlRegex, newAiInsightHtml);

fs.writeFileSync(file, content);
console.log('Fixed dashboard area error and moved dropdowns back to AI insight.');
