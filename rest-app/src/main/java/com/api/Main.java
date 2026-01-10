package com.api;

import org.glassfish.grizzly.http.server.HttpServer;
import org.glassfish.jersey.grizzly2.httpserver.GrizzlyHttpServerFactory;
import org.glassfish.jersey.server.ResourceConfig;

import java.net.URI;

public class Main {

    public static final String BASE_URI = "http://0.0.0.0:8080/api/";

    public static void main(String[] args) {
        final ResourceConfig rc = new ResourceConfig().packages("com.resources");
        
        final HttpServer server = GrizzlyHttpServerFactory.createHttpServer(URI.create(BASE_URI), rc);

        if (server != null) {
            System.out.println("Jersey app started with endpoints available at " + BASE_URI);
            System.out.println("Hit Ctrl+C to stop it...");
            try {
                Thread.currentThread().join();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }
}