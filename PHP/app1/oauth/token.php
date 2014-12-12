<?php
session_start();

include __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/OAuth/OAuthCode.php';
require_once __DIR__ . '/../lib/OAuth/OAuthTokenService.php';
require_once __DIR__ . '/../lib/Restful/RestfulEnvironment.php';

use Att\Api\OAuth\OAuthToken;
use Att\Api\OAuth\OAuthTokenService;
use Att\Api\OAuth\OAuthCode;
use Att\Api\Restful\RestfulEnvironment;
use \Exception;

if (isset($proxy_host) && isset($proxy_port))
    RestfulEnvironment::setProxy($proxy_host, $proxy_port);
if (isset($accept_all_certs))
    RestfulEnvironment::setAcceptAllCerts($accept_all_certs);

try {
    $tokenSrvc = new OAuthTokenService($FQDN, $api_key, $secret_key); 
    $token = null;
    if (isset($_POST['code'])) {
        $code = new OAuthCode($_POST['code']);
        $token = $tokenSrvc->getTokenUsingCode($code);
    } else {
        $token = $tokenSrvc->getTokenUsingScope('WEBRTC');
    }
    $_SESSION['token'] = serialize($token);

    $arr = array(
        'access_token' => $token->getAccessToken(),
        'refresh_token' => $token->getRefreshToken(),
        'expires_in' => $token->getExpiresIn(),
    );
    echo json_encode($arr);
} catch (Exception $e) {
    if (function_exists('http_response_code')) {
        http_response_code(500);
    } else {
        header("HTTP/1.1 500 Internal Server Error");
    }
    echo json_encode($e->getMessage());
}
    
/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
?>
