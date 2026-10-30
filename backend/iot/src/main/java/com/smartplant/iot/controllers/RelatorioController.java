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
import com.smartplant.iot.entities.Relatorio;
import com.smartplant.iot.services.RelatorioService;

import jakarta.validation.Valid;

@RestController
@CrossOrigin("*")
@RequestMapping("/api/relatorios")
public class RelatorioController {

    @Autowired
    private RelatorioService service;

    @GetMapping
    public ResponseEntity<List<Relatorio>> listarTodos() {
        return ResponseEntity.ok(service.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Relatorio> buscarPorId(@PathVariable Long id) {

        Optional<Relatorio> relatorio = service.buscarPorId(id);

        if (relatorio.isPresent()) {
            return ResponseEntity.ok(relatorio.get());
        }

        return ResponseEntity.notFound().build();
    }

    @GetMapping("/planta/{idPlanta}")
    public ResponseEntity<List<Relatorio>> listarPorPlanta(
            @PathVariable Long idPlanta) {

        return ResponseEntity.ok(
                service.listarPorPlanta(idPlanta));
    }

    @PostMapping("/planta/{idPlanta}")
    public ResponseEntity<Relatorio> cadastrar(
            @PathVariable Long idPlanta,
            @Valid @RequestBody Relatorio relatorio) {

        Optional<Relatorio> novoRelatorio =
                service.cadastrar(idPlanta, relatorio);

        if (novoRelatorio.isPresent()) {
            return ResponseEntity.ok(novoRelatorio.get());
        }

        return ResponseEntity.notFound().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Relatorio> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody Relatorio relatorio) {

        Optional<Relatorio> relatorioAtualizado =
                service.atualizar(id, relatorio);

        if (relatorioAtualizado.isPresent()) {
            return ResponseEntity.ok(relatorioAtualizado.get());
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