package com.smartplant.iot.services;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.smartplant.iot.entities.Planta;
import com.smartplant.iot.repositories.PlantaRepository;

@Service
public class PlantaService {

    @Autowired
    private PlantaRepository repository;

    public List<Planta> listarTodas() {
        return repository.findAll();
    }

    public Optional<Planta> buscarPorId(Long id) {
        return repository.findById(id);
    }

    public Planta cadastrar(Planta planta) {
        return repository.save(planta);
    }

    public Optional<Planta> atualizar(Long id, Planta planta) {

        Optional<Planta> plantaExistente = repository.findById(id);

        if (plantaExistente.isPresent()) {

            Planta plantaAtual = plantaExistente.get();

            plantaAtual.setNomePlanta(planta.getNomePlanta());
            plantaAtual.setUrl(planta.getUrl());
            plantaAtual.setEspecie(planta.getEspecie());
            plantaAtual.setUsuario(planta.getUsuario());

            return Optional.of(repository.save(plantaAtual));
        }

        return Optional.empty();
    }

    public boolean excluir(Long id) {

        if (repository.existsById(id)) {
            repository.deleteById(id);

            return true;
        }

        return false;
    }
}