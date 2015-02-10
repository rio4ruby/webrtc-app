package com.att.api.webrtc.model;

import java.io.IOException;
import java.io.Serializable;

import com.att.api.config.AppConfig;

public class ConfigBean implements Serializable {
    private static final long serialVersionUID = 138893983L;

    public AppConfig getConfig() throws IOException {
        return AppConfig.getInstance();
    }

    public String getSourceLink() throws IOException {
        return getConfig().getProperty("sourceLink");
    }

    public String getDownloadLink() throws IOException {
        return getConfig().getProperty("downloadLink");
    }

    public String getGithubServerLink() throws IOException {
        return getConfig().getProperty("githubServerLink");
    }

    public String getGithubClientLink() throws IOException {
        return getConfig().getProperty("githubClientLink");
    }

    public String getE911Id() throws IOException {
        return getConfig().getProperty("e911Id");
    }

    public String[] getVtnNumbers() throws IOException {
        return getConfig().getProperty("vtnNumbers").split(",");
    }

    public String getAccountDomain() throws IOException {
        return getConfig().getProperty("accountDomain");
    }
}
