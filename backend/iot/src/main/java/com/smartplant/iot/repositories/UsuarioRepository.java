package com.smartplant.iot.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.smartplant.iot.entities.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long>{

}
