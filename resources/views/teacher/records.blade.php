{{-- resources/views/teacher/records.blade.php --}}
@extends ('dash.main')

@push ('scripts')
    <script>
        currentUser.role = "teacher";
        currentUser.name = "Ms. Clara Teach";
        currentUser.id = "T-001";
        currentUser.subject = "Business Math";
        document.getElementById("role-tag").innerText = "TEACHER";
        document.getElementById("user-display-name").innerText =
            currentUser.name;
        document.getElementById("user-display-role").innerText = "teacher";
        document.getElementById("user-display-avatar").src =
            `https://ui-avatars.com/api/?name=${currentUser.name}&background=166534&color=fff&font-size=0.4`;
        navigate("records");
    </script>
@endpush
