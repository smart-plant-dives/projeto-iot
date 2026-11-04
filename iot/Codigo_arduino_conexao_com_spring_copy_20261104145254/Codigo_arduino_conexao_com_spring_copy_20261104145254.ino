#include <WiFi.h>
#include <HTTPClient.h>
#include "DHTesp.h"


// Wi-Fi
const char* WIFI_SSID = "SENAI";
const char* WIFI_PASSWORD = "senai2026";


// --- Configuração dos Pinos ---
const int PINO_DHT = 32;          // Sensor DHT11 no GPIO 32
const int PINO_SOLO = 34;         // Sensor de Solo / Potenciômetro no GPIO 34
const int PINO_RELE_BOMBA = 26;   // LED / Bomba no GPIO 26

DHTesp dht;

// --- Configuração dos Parâmetros de Rega ---
const int UMIDADE_SOLO_MINIMA = 40; // Abaixo deste valor %, ativa a bomba/LED

// Limites do ADC do ESP32 na vida real (0 a 4095)
// No solo seco a leitura fica ALTA (~3500-4095). No solo úmido a leitura BAIXA (~1000-1500).
const int SOLO_SECO_ADC = 4095;
const int SOLO_UMIDO_ADC = 1000;


// Envio para a API (mantenha false para testes locais)
const bool ENVIAR_PARA_API = false;
const char* API_URL = "http://192.168.56.1/leituraClimatica"; // Altere para o IP do seu PC


unsigned long ultimaLeitura = 0;
const unsigned long INTERVALO = 3000; // Leitura a cada 3 segundos


void conectarWiFi() {
  if (String(WIFI_SSID) == "NOME_DO_SEU_WIFI") {
    Serial.println("Wi-Fi nao configurado. Pulando conexao...");
    return;
  }


  Serial.println("Conectando ao Wi-Fi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);


  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 10000) {
    delay(500);
    Serial.print(".");
  }


  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Wi-Fi conectado!");
    Serial.print("IP do ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Nao foi possivel conectar ao Wi-Fi.");
  }
}


// Controle Direto da Rega (MANTÉM O LED ACESO ENQUANTO O SOLO ESTIVER SECO)
void verificarEControlarRega(int umidadeSoloAtual) {
  if (umidadeSoloAtual < UMIDADE_SOLO_MINIMA) {
    Serial.println("[STATUS BOMBA] Solo SECO -> LED/BOMBA: LIGADO [ON]");
    digitalWrite(PINO_RELE_BOMBA, HIGH); // Mantém o LED aceso
  } else {
    Serial.println("[STATUS BOMBA] Solo UMIDO -> LED/BOMBA: DESLIGADO [OFF]");
    digitalWrite(PINO_RELE_BOMBA, LOW);  // Mantém o LED desligado
  }
}


void setup() {
  Serial.begin(115200);
  delay(1000);


  Serial.println("\n=== INICIANDO SISTEMA DE IRRIGACAO ===");


  // Configuração dos Pinos
  pinMode(PINO_RELE_BOMBA, OUTPUT);
  pinMode(PINO_SOLO, INPUT);


  // --- TESTE DE BOOT DO LED ---
  // Se o LED piscar aqui, a fiação e o resistor estão 100% corretos!
  Serial.println("Testando LED no pino 26...");
  digitalWrite(PINO_RELE_BOMBA, HIGH);
  delay(2000); 
  digitalWrite(PINO_RELE_BOMBA, LOW);
  Serial.println("Teste do LED concluido.");


  // Configuração do DHT11
  dht.setup(PINO_DHT, DHTesp::DHT11);


  // Tentativa de conexão Wi-Fi
  conectarWiFi();
}


void loop() {
  if (millis() - ultimaLeitura >= INTERVALO || ultimaLeitura == 0) {
    ultimaLeitura = millis();


    // 1. LEITURA DO SOLO (Potenciômetro / Sensor Físico)
    int leituraAnalogicaSolo = analogRead(PINO_SOLO);
    int umidadeSoloPorcento = map(leituraAnalogicaSolo, SOLO_SECO_ADC, SOLO_UMIDO_ADC, 0, 100);
    umidadeSoloPorcento = constrain(umidadeSoloPorcento, 0, 100);


    // 2. LEITURA DO DHT11 (Ar)
    TempAndHumidity dados = dht.getTempAndHumidity();


    // 3. MONITOR SERIAL
    Serial.println("----------------------------------------");
    Serial.printf("Valor ADC do Solo (0 a 4095): %d\n", leituraAnalogicaSolo);
    Serial.printf("Umidade do Solo Calculada:    %d %%\n", umidadeSoloPorcento);


    if (dht.getStatus() == 0) {
      Serial.printf("Temperatura do Ar:            %.1f C\n", dados.temperature);
      Serial.printf("Umidade do Ar:                %.1f %%\n", dados.humidity);
    } else {
      Serial.println("Aviso: Sensor DHT11 desconectado ou com falha de leitura.");
    }


    // 4. ATIVAÇÃO DO LED / BOMBA
    verificarEControlarRega(umidadeSoloPorcento);
  }


  delay(50);
}