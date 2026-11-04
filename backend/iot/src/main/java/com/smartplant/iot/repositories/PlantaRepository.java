package com.smartplant.iot.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.smartplant.iot.entities.Planta;

@Repository
public interface PlantaRepository extends JpaRepository<Planta, Long> {

    List<Planta> findByUsuarioId(Long idUsuario);

}