#include <WiFi.h>
#include <HTTPClient.h>
#include "DHTesp.h"
#include <math.h>

// Rede SENAI
const char* WIFI_SSID = "SENAI";
const char* WIFI_PASSWORD = "senai2026";

// Confirme o IP real do servidor na rede SENAI.
const char* IP_SERVIDOR = "192.168.0.100";
const unsigned long ID_PLANTA = 1;
const unsigned long INTERVALO_LEITURA_MS = 3000;
const unsigned long INTERVALO_RECONEXAO_MS = 10000;

// Pinos
const int PINO_DHT = 32;
const int PINO_SOLO = 34;
const int PINO_RELE_BOMBA = 26;

// Calibração e rega
const int UMIDADE_SOLO_MINIMA = 40;
const int SOLO_SECO_ADC = 4095;
const int SOLO_UMIDO_ADC = 1000;

DHTesp dht;
unsigned long ultimaLeitura = 0;
unsigned long ultimaTentativaWiFi = 0;
bool bombaLigada = false;

void conectarWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  ultimaTentativaWiFi = millis();
  Serial.print("Conectando a rede ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED &&
         millis() - inicio < 10000) {
    delay(250);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi conectado. IP do ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Falha na conexao Wi-Fi. Nova tentativa em breve.");
  }
}

int lerUmidadeSolo() {
  int adc = analogRead(PINO_SOLO);
  int porcentagem = map(
    adc, SOLO_SECO_ADC, SOLO_UMIDO_ADC, 0, 100
  );
  porcentagem = constrain(porcentagem, 0, 100);

  Serial.printf("ADC do solo: %d | Umidade: %d%%\n",
                adc, porcentagem);
  return porcentagem;
}

void controlarRega(int umidadeSolo) {
  bool deveLigar = umidadeSolo < UMIDADE_SOLO_MINIMA;

  if (deveLigar != bombaLigada) {
    bombaLigada = deveLigar;
    digitalWrite(PINO_RELE_BOMBA, bombaLigada ? HIGH : LOW);
  }

  Serial.println(bombaLigada
    ? "Solo seco: bomba/LED ligado"
    : "Solo umido: bomba/LED desligado");
}

String numeroOuNull(float valor) {
  return isnan(valor) ? "null" : String(valor, 1);
}

void enviarLeitura(int umidadeSolo, float temperatura,
                   float umidadeAr) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Leitura nao enviada: Wi-Fi desconectado.");
    return;
  }

  String url = "http://" + String(IP_SERVIDOR) +
               "/api/relatorios/planta/" + String(ID_PLANTA);

  // O backend define dataHora automaticamente.
  // nivelAgua e quantidadeRega nao sao enviados porque
  // este circuito nao mede nivel de agua nem volume de rega.
  String json = "{\"umidadeSolo\":" + String(umidadeSolo) +
                ",\"temperatura\":" + numeroOuNull(temperatura) +
                ",\"umidadeAr\":" + numeroOuNull(umidadeAr) +
                "}";

  HTTPClient http;
  http.setTimeout(5000);

  if (!http.begin(url)) {
    Serial.println("Falha ao preparar requisicao HTTP.");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  int codigo = http.POST(json);

  if (codigo >= 200 && codigo < 300) {
    Serial.printf("Leitura gravada. HTTP %d\n", codigo);
  } else {
    Serial.printf("Falha ao gravar. HTTP %d\n", codigo);
    if (codigo > 0) Serial.println(http.getString());
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(PINO_RELE_BOMBA, OUTPUT);
  digitalWrite(PINO_RELE_BOMBA, LOW);
  pinMode(PINO_SOLO, INPUT);
  analogReadResolution(12);

  dht.setup(PINO_DHT, DHTesp::DHT11);
  conectarWiFi();
}

void loop() {
  unsigned long agora = millis();

  if (WiFi.status() != WL_CONNECTED &&
      agora - ultimaTentativaWiFi >= INTERVALO_RECONEXAO_MS) {
    conectarWiFi();
  }

  if (ultimaLeitura == 0 ||
      agora - ultimaLeitura >= INTERVALO_LEITURA_MS) {
    ultimaLeitura = agora;

    int umidadeSolo = lerUmidadeSolo();
    TempAndHumidity dados = dht.getTempAndHumidity();

    if (isnan(dados.temperature) || isnan(dados.humidity)) {
      Serial.println("Falha na leitura do DHT11.");
    } else {
      Serial.printf("Temperatura: %.1f C | Umidade do ar: %.1f%%\n",
                    dados.temperature, dados.humidity);
    }

    controlarRega(umidadeSolo);
    enviarLeitura(umidadeSolo, dados.temperature, dados.humidity);
  }

  delay(50);
}
