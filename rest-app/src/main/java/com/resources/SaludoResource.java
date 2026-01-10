package com.resources;

import com.models.Mensaje;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

@Path("saludo")
public class SaludoResource {

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Mensaje getSaludo() {
        return new Mensaje("Sistema", "¡Hola desde Java 8!");
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response crearMensaje(Mensaje nuevoMensaje) {
        String resultado = "Recibido mensaje de: " + nuevoMensaje.getAutor();
        return Response.status(Response.Status.CREATED)
                       .entity(new Mensaje("Servidor", resultado))
                       .build();
    }
}