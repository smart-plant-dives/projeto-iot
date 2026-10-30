package com.smartplant.iot.services;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.smartplant.iot.entities.Planta;
import com.smartplant.iot.entities.Relatorio;
import com.smartplant.iot.repositories.PlantaRepository;
import com.smartplant.iot.repositories.RelatorioRepository;

@Service
public class RelatorioService {
	
	@Autowired
	private RelatorioRepository repository;

	@Autowired
	private PlantaRepository plantaRepository;


    public List<Relatorio> listarTodos() {
        return repository.findAll();
    }

    public List<Relatorio> listarPorPlanta(Long idPlanta) {
        return repository.findByPlantaId(idPlanta);
    }

    public Optional<Relatorio> buscarPorId(Long id) {
        return repository.findById(id);
    }

    public Optional<Relatorio> cadastrar(Long idPlanta, Relatorio relatorio) {

        Optional<Planta> planta = plantaRepository.findById(idPlanta);

        if (planta.isPresent()) {

            relatorio.setPlanta(planta.get());
            relatorio.setDataHora(LocalDateTime.now());

            return Optional.of(repository.save(relatorio));
        }

        return Optional.empty();
    }

    public Optional<Relatorio> atualizar(Long id, Relatorio relatorio) {

        Optional<Relatorio> relatorioExistente =
                repository.findById(id);

        if (relatorioExistente.isPresent()) {

            Relatorio relatorioAtual = relatorioExistente.get();

            relatorioAtual.setUmidadeSolo(relatorio.getUmidadeSolo());
            relatorioAtual.setTemperatura(relatorio.getTemperatura());
            relatorioAtual.setUmidadeAr(relatorio.getUmidadeAr());
            relatorioAtual.setNivelAgua(relatorio.getNivelAgua());
            relatorioAtual.setQuantidadeRega(relatorio.getQuantidadeRega());

            return Optional.of(repository.save(relatorioAtual));
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