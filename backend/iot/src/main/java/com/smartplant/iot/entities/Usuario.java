package com.smartplant.iot.entities;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonManagedReference;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;



@Entity
@Table(name = "tb_usuario")
public class Usuario {
	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Long id;
    
    @NotBlank(message = "O nome é obrigatório.")
    @Column(name = "nome_usuario",nullable = false, length = 100)
    private String nome;
    
    
    @NotBlank(message = "O email é obrigatório.")
    @Email(message = "Email inválido.")
    private String email;
    
    @NotBlank(message = "A senha é obrigatória.")
    @Column(nullable = false)
    @Size(min=8, max= 8, message="A senha deve conter 8 caracteres")
    private String senha;

   
    @OneToMany(mappedBy = "usuario")
    @JsonManagedReference
    private List<Planta> plantas;
    
    public Usuario() {
        
    }
    
    public Usuario(String nome, String email, String senha) {
        this.nome = nome;
        this.email = email;
        this.senha = senha;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }


    public String getSenha() {
        return senha;
    }

    public void setSenha(String senha) {
        this.senha = senha;
    }

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}
	
	public List<Planta> getPlantas() {
	    return plantas;
	}

	public void setPlantas(List<Planta> plantas) {
	    this.plantas = plantas;
	}

}