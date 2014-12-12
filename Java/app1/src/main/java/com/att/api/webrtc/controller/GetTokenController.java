/*
 * Copyright 2014 AT&T
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.att.api.webrtc.controller;

import java.io.IOException;
import java.io.PrintWriter;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.json.JSONObject;

import com.att.api.controller.APIController;
import com.att.api.oauth.OAuthService;
import com.att.api.oauth.OAuthToken;
import com.att.api.rest.RESTException;

public class GetTokenController extends APIController {
    private static final long serialVersionUID = 1L;

    public void doPost(HttpServletRequest request, 
            HttpServletResponse response) throws ServletException, IOException{

        try {
            final String FQDN = appConfig.getOauthFQDN();
            final String APPID = appConfig.getClientId();
            final String APPSECRET = appConfig.getClientSecret(); 

            final OAuthService service = new OAuthService(FQDN, APPID, APPSECRET);

            OAuthToken token = null;
            final String code = (String) request.getParameter("code");
            if (code != null) {
                token = service.getTokenUsingCode(code);
            }
            else {
                token = service.getToken("WEBRTC");
            }

            setSessionToken(request, token);

            JSONObject t = new JSONObject()
                .put("access_token", token.getAccessToken())
                .put("refresh_token", token.getRefreshToken());

            response.setContentType("text/html");
            PrintWriter writer = response.getWriter();
            writer.print(t);
            writer.flush();
        } catch (RESTException e) {
            response.sendError(500, e.getMessage());
        }
    }

    public void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        doPost(request, response);
    }
}
