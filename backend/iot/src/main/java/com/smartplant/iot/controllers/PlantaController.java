package com.smartplant.iot.controllers;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smartplant.iot.entities.Planta;
import com.smartplant.iot.services.PlantaService;

import jakarta.validation.Valid;

@RestController
@CrossOrigin("*")
@RequestMapping("/api/plantas")
public class PlantaController {

    @Autowired
    private PlantaService service;

    @GetMapping
    public ResponseEntity<List<Planta>> listarTodas() {

        return ResponseEntity.ok(service.listarTodas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Planta> buscarPorId(@PathVariable Long id) {

        Optional<Planta> planta = service.buscarPorId(id);

        if (planta.isPresent()) {
            return ResponseEntity.ok(planta.get());
        }

        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<Planta> cadastrar(@Valid @RequestBody Planta planta) {

        Planta novaPlanta = service.cadastrar(planta);

        return ResponseEntity.ok(novaPlanta);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Planta> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody Planta planta) {

        Optional<Planta> plantaAtualizada = service.atualizar(id, planta);

        if (plantaAtualizada.isPresent()) {
            return ResponseEntity.ok(plantaAtualizada.get());
        }

        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {

        if (service.excluir(id)) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.notFound().build();
    }
}