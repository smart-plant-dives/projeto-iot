#include <WiFi.h>
#include <HTTPClient.h>
#include "DHTesp.h"
#include <math.h>

// Rede SENAI
const char* WIFI_SSID = "SENAI";
const char* WIFI_PASSWORD = "senai2026";

// Servidor e planta cadastrada
const char* IP_SERVIDOR = "192.168.0.100";
const unsigned long ID_PLANTA = 1;

// Intervalos
const unsigned long INTERVALO_LEITURA_MS = 10000;
const unsigned long INTERVALO_RECONEXAO_MS = 10000;

// Pinos
const int PINO_DHT = 32;
const int PINO_SOLO = 34;
const int PINO_RELE_BOMBA = 26;

// Calibração do sensor de solo
const int SOLO_SECO_ADC = 4095;
const int SOLO_UMIDO_ADC = 1000;
const int UMIDADE_SOLO_MINIMA = 40;

DHTesp dht;

unsigned long ultimaLeitura = 0;
unsigned long ultimaTentativaWiFi = 0;
bool bombaLigada = false;

void conectarWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  ultimaTentativaWiFi = millis();

  Serial.print("Conectando ao Wi-Fi ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long inicio = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - inicio < 10000) {
    delay(250);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi conectado. IP do ESP32: ");
    Serial.println(WiFi.localIP());

    Serial.print("Sinal Wi-Fi: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("Falha ao conectar. Tentarei novamente.");
  }
}

int lerUmidadeSolo() {
  int leituraADC = analogRead(PINO_SOLO);

  int umidade = map(
    leituraADC,
    SOLO_SECO_ADC,
    SOLO_UMIDO_ADC,
    0,
    100
  );

  umidade = constrain(umidade, 0, 100);

  Serial.printf(
    "ADC do solo: %d | Umidade do solo: %d%%\n",
    leituraADC,
    umidade
  );

  return umidade;
}

void controlarRega(int umidadeSolo) {
  bool deveLigar = umidadeSolo < UMIDADE_SOLO_MINIMA;

  if (deveLigar != bombaLigada) {
    bombaLigada = deveLigar;
    digitalWrite(
      PINO_RELE_BOMBA,
      bombaLigada ? HIGH : LOW
    );
  }

  Serial.println(
    bombaLigada
      ? "Solo seco: bomba/LED ligado"
      : "Solo umido: bomba/LED desligado"
  );
}

String numeroOuNull(float valor) {
  if (isnan(valor)) {
    return "null";
  }

  return String(valor, 1);
}

void enviarLeitura(
  int umidadeSolo,
  float temperatura,
  float umidadeAr
) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(
      "Leitura nao enviada: Wi-Fi desconectado."
    );
    return;
  }

  String url =
    "http://" + String(IP_SERVIDOR) +
    "/api/relatorios/planta/" +
    String(ID_PLANTA);

  String json =
    "{\"umidadeSolo\":" + String(umidadeSolo) +
    ",\"temperatura\":" + numeroOuNull(temperatura) +
    ",\"umidadeAr\":" + numeroOuNull(umidadeAr) +
    "}";

  WiFiClient cliente;
  HTTPClient http;

  http.setConnectTimeout(10000);
  http.setTimeout(10000);
  http.setReuse(false);

  if (!http.begin(cliente, url)) {
    Serial.println(
      "Falha ao preparar a conexao HTTP."
    );
    return;
  }

  http.addHeader(
    "Content-Type",
    "application/json"
  );

  Serial.print("Enviando para: ");
  Serial.println(url);
  Serial.print("Dados: ");
  Serial.println(json);

  int codigo = http.POST(json);

  if (codigo >= 200 && codigo < 300) {
    Serial.printf(
      "Leitura gravada. HTTP %d\n",
      codigo
    );
  } else if (codigo < 0) {
    Serial.printf(
      "Falha na conexao HTTP (%d): %s\n",
      codigo,
      http.errorToString(codigo).c_str()
    );

    Serial.printf(
      "Sinal Wi-Fi: %d dBm\n",
      WiFi.RSSI()
    );
  } else {
    Serial.printf(
      "Servidor recusou a leitura. HTTP %d\n",
      codigo
    );

    String resposta = http.getString();
    if (resposta.length() > 0) {
      Serial.println(resposta);
    }
  }

  http.end();

  // Não reenviamos automaticamente: a API pode ter gravado
  // a leitura mesmo quando a resposta não chegou ao ESP32.
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println(
    "\n=== SISTEMA DE IRRIGACAO SMARTPLANT ==="
  );

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
      agora - ultimaTentativaWiFi >=
        INTERVALO_RECONEXAO_MS) {
    conectarWiFi();
  }

  if (ultimaLeitura == 0 ||
      agora - ultimaLeitura >=
        INTERVALO_LEITURA_MS) {
    ultimaLeitura = agora;

    Serial.println("------------------------------");

    int umidadeSolo = lerUmidadeSolo();
    TempAndHumidity dados =
      dht.getTempAndHumidity();

    if (isnan(dados.temperature) ||
        isnan(dados.humidity)) {
      Serial.println(
        "Falha na leitura do DHT11."
      );
    } else {
      Serial.printf(
        "Temperatura: %.1f C | Umidade do ar: %.1f%%\n",
        dados.temperature,
        dados.humidity
      );
    }

    controlarRega(umidadeSolo);

    enviarLeitura(
      umidadeSolo,
      dados.temperature,
      dados.humidity
    );
  }

  delay(50);
}
