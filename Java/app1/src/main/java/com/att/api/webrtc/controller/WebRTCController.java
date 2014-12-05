package com.att.api.webrtc.controller;

import java.io.IOException;

import javax.servlet.RequestDispatcher;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.att.api.controller.APIController;
import com.att.api.webrtc.model.ConfigBean;

public class WebRTCController extends APIController {
    private static final long serialVersionUID = 1L;

    public void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        final String authcode = (String) request.getParameter("code");

        request.setAttribute("cfg", new ConfigBean());
        if (authcode != null)
            request.setAttribute("authcode", authcode);

        final String forward = "/WEB-INF/WebRTC.jsp";
        RequestDispatcher dispatcher = request.getRequestDispatcher(forward);
        dispatcher.forward(request, response);
    }

    public void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        doPost(request, response);
    }
}
