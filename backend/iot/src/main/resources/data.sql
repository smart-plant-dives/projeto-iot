INSERT IGNORE INTO tb_usuario (id_usuario, nome_usuario, email, senha)
VALUES
(1, 'Isabella Minhao', 'isabella@gmail.com', 'isa1234'),
(2, 'Maria Benini', 'maribenini@gmail.com', 'maria123'),
(3, 'Luana Santos', 'lusantos@gmail.com', 'lu123456'),
(4, 'Leticia Gomes', 'legomes@gmail.com', 'gomes123'),
(5, 'Laura Fontes', 'laufontes@gmail.com', 'lau54321'),
(6, 'Stephanie Favero', 'stephfaveros@gmail.com', '87654321');


INSERT IGNORE INTO tb_planta (id_planta, nome_planta, url, especie, id_usuario)
VALUES
(1, 'Samambaia', 'https://images.unsplash.com/photo-1597055181300-a8e1e6c5e6a8', 'Nephrolepis exaltata', 1),
(2, 'Jiboia', 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b', 'Epipremnum aureum', 2),
(3, 'Costela de Adao', 'https://images.unsplash.com/photo-1611211232932-da3113c5b2c8', 'Monstera deliciosa', 3),
(4, 'Espada de Sao Jorge', 'https://images.unsplash.com/photo-1593691509543-c55fb32e5cee', 'Dracaena trifasciata', 4),
(5, 'Lirio da Paz', 'https://images.unsplash.com/photo-1593691509543-c55fb32e5cee', 'Spathiphyllum wallisii', 5),
(6, 'Suculenta', 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a', 'Echeveria elegans', 6);