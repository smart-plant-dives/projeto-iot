package com.smartplant.iot.entities;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "tb_planta")
public class Planta {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_planta")
	private Long id;

	@Column(name = "nome_planta", nullable = false, length = 70)
	private String nomePlanta;
	
	@Column(name = "url")
	private String url;
	
	@Column(name = "especie")
	private String especie;
	
	@ManyToOne
	@JoinColumn(name = "id_usuario")
	@JsonBackReference
	private Usuario usuario;
	
	@OneToMany(mappedBy = "planta")
	@JsonManagedReference
	private List<Relatorio> relatorios;

	public Planta() {

	}

	public Planta(Long id, String nomePlanta, String url, String especie, Usuario usuario, List<Relatorio> relatorios) {

	    this.id = id;
	    this.nomePlanta = nomePlanta;
	    this.url = url;
	    this.especie = especie;
	    this.usuario = usuario;
	    this.relatorios = relatorios;
	}

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getNomePlanta() {
		return nomePlanta;
	}

	public void setNomePlanta(String nomePlanta) {
		this.nomePlanta = nomePlanta;
	}

	public String getUrl() {
		return url;
	}

	public void setUrl(String url) {
		this.url = url;
	}

	public String getEspecie() {
		return especie;
	}

	public void setEspecie(String especie) {
		this.especie = especie;
	}

	public Usuario getUsuario() {
		return usuario;
	}

	public void setUsuario(Usuario usuario) {
		this.usuario = usuario;
	}

	public List<Relatorio> getRelatorios() {
		return relatorios;
	}

	public void setRelatorios(List<Relatorio> relatorios) {
		this.relatorios = relatorios;
	}
	
	
}
