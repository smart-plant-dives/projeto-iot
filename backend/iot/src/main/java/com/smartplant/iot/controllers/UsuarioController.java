package com.smartplant.iot.controllers;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
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

import com.smartplant.iot.entities.Usuario;
import com.smartplant.iot.repositories.UsuarioRepository;
import com.smartplant.iot.services.UsuarioService;

import jakarta.validation.Valid;

@RestController
@CrossOrigin("*")
@RequestMapping("/api/usuarios")
public class UsuarioController {

    @Autowired
    private UsuarioService service;

    @Autowired
    private UsuarioRepository repository;

    @GetMapping
    public ResponseEntity<List<Usuario>> listarTodos() {
        return ResponseEntity.ok(service.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Usuario> buscarPorId(@PathVariable Long id) {

        Optional<Usuario> usuario = service.buscarPorId(id);

        if (usuario.isPresent()) {
            return ResponseEntity.ok(usuario.get());
        }

        return ResponseEntity.notFound().build();
    }

    // CADASTRO
    @PostMapping
    public ResponseEntity<?> cadastrar(
            @Valid @RequestBody Usuario usuario) {

        if (repository.existsByEmail(usuario.getEmail())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Este e-mail já está cadastrado.");
        }

        Usuario novoUsuario = service.cadastrar(usuario);

        return ResponseEntity.ok(respostaUsuario(novoUsuario));
    }

    // LOGIN
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody Map<String, String> dados) {

        String email = dados.get("email");
        String senha = dados.get("senha");

        if (email == null || senha == null) {
            return ResponseEntity.badRequest()
                    .body("Informe o e-mail e a senha.");
        }

        Optional<Usuario> resultado = repository.findByEmail(email);

        if (resultado.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("E-mail ou senha incorretos.");
        }

        Usuario usuario = resultado.get();

        if (!usuario.getSenha().equals(senha)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("E-mail ou senha incorretos.");
        }

        return ResponseEntity.ok(respostaUsuario(usuario));
    }

    // RETORNA OS DADOS DO USUÁRIO SEM A SENHA
    private Map<String, Object> respostaUsuario(Usuario usuario) {

        Map<String, Object> dados = new HashMap<>();

        dados.put("id", usuario.getId());
        dados.put("nome", usuario.getNome());
        dados.put("email", usuario.getEmail());

        return dados;
    }

    @PutMapping("/{id}")
    public ResponseEntity<Usuario> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody Usuario usuario) {

        Optional<Usuario> usuarioAtualizado =
                service.atualizar(id, usuario);

        if (usuarioAtualizado.isPresent()) {
            return ResponseEntity.ok(usuarioAtualizado.get());
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
