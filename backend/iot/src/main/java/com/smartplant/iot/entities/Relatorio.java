package com.smartplant.iot.entities;

import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "tb_relatorio")
public class Relatorio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_relatorio")
    private Long id;

    @Column(name = "umidade_solo")
    private Double umidadeSolo;

    @Column(name = "temperatura")
    private Double temperatura;

    @Column(name = "umidade_ar")
    private Double umidadeAr;

    @Column(name = "nivel_agua")
    private Double nivelAgua;

    @Column(name = "quantidade_rega")
    private Integer quantidadeRega;

    @Column(name = "data_hora")
    private LocalDateTime dataHora;

    @ManyToOne
    @JoinColumn(name = "id_planta", nullable = false)
    @JsonBackReference
    private Planta planta;

    public Relatorio() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Double getUmidadeSolo() {
        return umidadeSolo;
    }

    public void setUmidadeSolo(Double umidadeSolo) {
        this.umidadeSolo = umidadeSolo;
    }

    public Double getTemperatura() {
        return temperatura;
    }

    public void setTemperatura(Double temperatura) {
        this.temperatura = temperatura;
    }

    public Double getUmidadeAr() {
        return umidadeAr;
    }

    public void setUmidadeAr(Double umidadeAr) {
        this.umidadeAr = umidadeAr;
    }

    public Double getNivelAgua() {
        return nivelAgua;
    }

    public void setNivelAgua(Double nivelAgua) {
        this.nivelAgua = nivelAgua;
    }

    public Integer getQuantidadeRega() {
        return quantidadeRega;
    }

    public void setQuantidadeRega(Integer quantidadeRega) {
        this.quantidadeRega = quantidadeRega;
    }

    public LocalDateTime getDataHora() {
        return dataHora;
    }

    public void setDataHora(LocalDateTime dataHora) {
        this.dataHora = dataHora;
    }

    public Planta getPlanta() {
        return planta;
    }

    public void setPlanta(Planta planta) {
        this.planta = planta;
    }
}