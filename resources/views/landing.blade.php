<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CNHS | Select Portal</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    />
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: "#166534",
                        primaryDark: "#14532d",
                        accent: "#f59e0b",
                    },
                    boxShadow: { soft: "0 4px 20px -2px rgba(0, 0, 0, 0.05)" },
                },
            },
        };
    </script>
</head>
<body
    class="bg-[#f8fafc] h-screen flex items-center justify-center p-4 antialiased"
>
    <div
        class="max-w-3xl w-full bg-white rounded-2xl shadow-soft border border-gray-100 flex flex-col md:flex-row overflow-hidden"
    >
        <!-- Left Side: Branding -->
        <div
            class="md:w-5/12 bg-primary p-8 text-white flex flex-col justify-between relative overflow-hidden"
        >
            <div
                class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50"
            ></div>

            <div class="relative z-10">
                <div
                    class="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6 border border-white/20"
                >
                    <i class="fas fa-graduation-cap text-2xl text-accent"></i>
                </div>
                <h1 class="text-2xl font-bold tracking-tight mb-1">
                    City National High School
                </h1>
                <p class="text-sm text-white/70">AI-Driven Student Evaluation System</p>
            </div>

            <div class="relative z-10 mt-12 text-xs text-white/50">
                <p>&copy; 2026 CNHS. All rights reserved.</p>
            </div>
        </div>

        <!-- Right Side: Student Access -->
        <div
            class="md:w-7/12 p-8 md:p-10 flex flex-col justify-center bg-white z-10"
        >
            <h2 class="text-xl font-bold text-gray-900 mb-1">Student Access</h2>
            <p class="text-sm text-gray-500 mb-8">Scan your ID to view your academic performance report.</p>

            <div class="flex-1 flex flex-col items-center justify-center py-12">
                <div
                    class="w-24 h-24 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 border border-gray-100 shadow-inner"
                >
                    <i class="fas fa-qrcode text-5xl text-gray-400"></i>
                </div>
                <button
                    onclick="alert('QR Scanner modal would open here.')"
                    class="w-full max-w-xs py-3.5 text-sm font-bold text-white bg-primary hover:bg-primaryDark rounded-xl transition-colors shadow-md flex items-center justify-center gap-3"
                >
                    <i class="fas fa-camera"></i> Scan Student ID
                </button>
                <p class="text-xs text-gray-400 text-center mt-4 max-w-xs">Please hold your ID card steadily in front of the camera to view your grades.</p>
            </div>
        </div>
    </div>
</body>
</html>
