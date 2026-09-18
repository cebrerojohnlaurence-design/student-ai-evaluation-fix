{{--
    resources/views/welcome.blade.php
    Redirect to login — overwrites the default Laravel welcome page
--}}
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url={{ route('login') }}" />
    <title>Redirecting...</title>
</head>
<body>
    <script>
        window.location.href = "{{ route('login') }}";
    </script>
</body>
</html>
