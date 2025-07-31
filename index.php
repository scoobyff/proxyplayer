<?php
// Set CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: *");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

$get = $_GET['get'];
$mpdUrl = 'https://tataplay.slivcdn.com/hls/live/' . $get;

// Set headers for fetching remote
$mpdheads = [
  'http' => [
      'header' => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36\r\n",
      'follow_location' => 1,
      'timeout' => 5
  ]
];
$context = stream_context_create($mpdheads);

// Fetch and output
$res = @file_get_contents($mpdUrl, false, $context);

if ($res === false) {
    http_response_code(502);
    echo "Failed to fetch resource.";
} else {
    // Optionally forward content-type
    header("Content-Type: application/dash+xml");
    echo $res;
}
?>