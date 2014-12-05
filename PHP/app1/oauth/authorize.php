<?php

include __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/OAuth/OAuthCodeRequest.php';

use Att\Api\OAuth\OAuthCodeRequest;

$scope = "WEBRTCMOBILE";
$codeUrl = $FQDN . '/oauth/v4/authorize';
$codeRequest = new OAuthCodeRequest(
    $codeUrl, $api_key, $scope, $authorize_redirect_uri
);
$url = $codeRequest->getCodeLocation();
$arr = array('consent_url' => $url);
echo json_encode($arr);
    
/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
?>
