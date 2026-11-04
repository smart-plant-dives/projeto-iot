package com.smartplant.iot.services;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.smartplant.iot.entities.Planta;
import com.smartplant.iot.entities.Usuario;
import com.smartplant.iot.repositories.PlantaRepository;
import com.smartplant.iot.repositories.UsuarioRepository;

@Service
public class PlantaService {

    @Autowired
    private PlantaRepository repository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    public List<Planta> listarTodas() {
        return repository.findAll();
    }

    public List<Planta> listarPorUsuario(Long idUsuario) {
        return repository.findByUsuarioId(idUsuario);
    }

    public Optional<Planta> buscarPorId(Long id) {
        return repository.findById(id);
    }

    public Planta cadastrar(Planta planta) {

        if (planta.getUsuario() == null ||
                planta.getUsuario().getId() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "O usuário da planta não foi informado."
            );
        }

        Long idUsuario = planta.getUsuario().getId();

        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Usuário não encontrado."
                ));

        planta.setUsuario(usuario);

        return repository.save(planta);
    }

    public Optional<Planta> atualizar(Long id, Planta planta) {

        Optional<Planta> plantaExistente = repository.findById(id);

        if (plantaExistente.isPresent()) {

            Planta plantaAtual = plantaExistente.get();

            plantaAtual.setNomePlanta(planta.getNomePlanta());
            plantaAtual.setUrl(planta.getUrl());
            plantaAtual.setEspecie(planta.getEspecie());

            // Mantém o proprietário original da planta.

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