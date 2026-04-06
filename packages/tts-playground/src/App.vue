<script setup lang="ts">
import {
  type AccentIR,
  type AccentIREmitWarning,
  type UniDicRawToken,
} from "@japanese-tts-analyzer/accent-ir";
import type { AnalyzeAzurePhonemeAlphabet } from "@japanese-tts-analyzer/analyze-contract";
import {
  darkTheme,
  NAlert,
  NButton,
  NCard,
  NCollapse,
  NCollapseItem,
  NConfigProvider,
  NEmpty,
  NForm,
  NFormItem,
  NGi,
  NGlobalStyle,
  NGrid,
  NInput,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NStatistic,
  NTag,
  NText,
  type GlobalThemeOverrides,
  type SelectOption,
} from "naive-ui";
import { computed, onBeforeUnmount, ref } from "vue";
import {
  type AnalyzeBackendMode,
  buildSampleSSML,
  DEFAULT_AZURE_PHONEME_ALPHABET,
  DEFAULT_OUTPUT_FORMAT,
  DEFAULT_VOICE,
  readAzurePhonemeAlphabet,
  readAnalyzeBackendMode,
  readAnalyzeResponse,
  readErrorMessage,
  readSessionValue,
  SAMPLE_CASES,
  SESSION_KEYS,
  writeSessionValue,
} from "./playground-support";

type SynthesisStatus = "idle" | "submitting" | "success" | "error";
type PlaygroundMode = "sample" | "free-text";
type NaiveStatus = "default" | "info" | "success" | "warning" | "error";

const DEFAULT_REGION = "japaneast";
const defaultExpandedPanels = ["accent-ir"];

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: "#38bdf8",
    primaryColorHover: "#67e8f9",
    primaryColorPressed: "#2563eb",
    primaryColorSuppl: "#38bdf8",
    infoColor: "#38bdf8",
    infoColorHover: "#67e8f9",
    infoColorPressed: "#0284c7",
    successColor: "#22c55e",
    successColorHover: "#4ade80",
    successColorPressed: "#16a34a",
    warningColor: "#f59e0b",
    warningColorHover: "#fbbf24",
    warningColorPressed: "#d97706",
    errorColor: "#ef4444",
    errorColorHover: "#f87171",
    errorColorPressed: "#dc2626",
    borderRadius: "18px",
    borderRadiusSmall: "14px",
    bodyColor: "#020617",
    cardColor: "#0f172a",
    popoverColor: "#111c33",
    modalColor: "#111c33",
    tableColor: "#0f172a",
    textColorBase: "#e2e8f0",
  },
};

const outputFormatOptions: SelectOption[] = [
  {
    value: "audio-24khz-48kbitrate-mono-mp3",
    label: "24kHz / 48kbps MP3",
  },
  {
    value: "audio-24khz-96kbitrate-mono-mp3",
    label: "24kHz / 96kbps MP3",
  },
  {
    value: "audio-48khz-96kbitrate-mono-mp3",
    label: "48kHz / 96kbps MP3",
  },
];

const phonemeOptions: SelectOption[] = [
  {
    value: "sapi",
    label: "SAPI / Azure Speech 既定",
  },
  {
    value: "ipa",
    label: "IPA / 発音の差分確認向け",
  },
];

const modeOptions: Array<{ label: string; value: PlaygroundMode }> = [
  {
    label: "Sample",
    value: "sample",
  },
  {
    label: "Free text",
    value: "free-text",
  },
];

const subscriptionKey = ref(readSessionValue(SESSION_KEYS.subscriptionKey));
const region = ref(readSessionValue(SESSION_KEYS.region, DEFAULT_REGION));
const voice = ref(readSessionValue(SESSION_KEYS.voice, DEFAULT_VOICE));
const outputFormat = ref(
  readSessionValue(SESSION_KEYS.outputFormat, DEFAULT_OUTPUT_FORMAT)
);
const azurePhonemeAlphabet = ref<AnalyzeAzurePhonemeAlphabet>(
  readAzurePhonemeAlphabet(
    readSessionValue(
      SESSION_KEYS.azurePhonemeAlphabet,
      DEFAULT_AZURE_PHONEME_ALPHABET
    )
  )
);
const selectedSampleId = ref(SAMPLE_CASES[0].id);
const initialSample = buildSampleSSML(
  SAMPLE_CASES[0].id,
  voice.value || DEFAULT_VOICE,
  azurePhonemeAlphabet.value
);
const ssml = ref(initialSample.ssml);
const generationWarnings = ref<AccentIREmitWarning[]>(initialSample.warnings);
const status = ref<SynthesisStatus>("idle");
const statusText = ref("");
const audioUrl = ref<string | null>(null);
const mode = ref<PlaygroundMode>("sample");
const freeText = ref("");
const latestAccentIR = ref<AccentIR | null>(initialSample.accentIR);
const latestRawTokens = ref<UniDicRawToken[] | null>([...initialSample.rawTokens]);
const analyzeBackendMode = ref<AnalyzeBackendMode>("unknown");
const appliedSampleState = ref({
  sampleId: selectedSampleId.value,
  voice: voice.value || DEFAULT_VOICE,
  azurePhonemeAlphabet: azurePhonemeAlphabet.value,
});

const sampleOptions = computed<SelectOption[]>(() =>
  SAMPLE_CASES.map((sample) => ({
    label: sample.label,
    value: sample.id,
  }))
);

const selectedSample = computed(
  () =>
    SAMPLE_CASES.find((sample) => sample.id === selectedSampleId.value) ??
    SAMPLE_CASES[0]
);

const metrics = computed(() => [
  {
    label: "Mode",
    value: mode.value === "sample" ? "Sample mode" : "Free-text mode",
  },
  {
    label: "Samples",
    value: `${SAMPLE_CASES.length}`,
  },
  {
    label: "Credentials",
    value:
      subscriptionKey.value.trim() && region.value.trim() ? "入力済み" : "未入力",
  },
  {
    label: "Warnings",
    value: `${generationWarnings.value.length}`,
  },
]);

const isSubmitting = computed(() => status.value === "submitting");
const hasCredentials = computed(
  () => Boolean(subscriptionKey.value.trim()) && Boolean(region.value.trim())
);
const ssmlLineCount = computed(() =>
  ssml.value.trim() ? ssml.value.split(/\r?\n/).length : 0
);
const accentIRJson = computed(() =>
  latestAccentIR.value ? JSON.stringify(latestAccentIR.value, null, 2) : ""
);
const rawTokensJson = computed(() =>
  latestRawTokens.value ? JSON.stringify(latestRawTokens.value, null, 2) : ""
);
const sampleComposerDirty = computed(
  () =>
    mode.value === "sample" &&
    (selectedSampleId.value !== appliedSampleState.value.sampleId ||
      (voice.value || DEFAULT_VOICE) !== appliedSampleState.value.voice ||
      azurePhonemeAlphabet.value !==
        appliedSampleState.value.azurePhonemeAlphabet)
);

const backendModeLabel = computed(() => {
  switch (analyzeBackendMode.value) {
    case "mock":
      return "Worker mock";
    case "proxy":
      return "analyze-backend";
    default:
      return "未判定";
  }
});

const backendModeTagType = computed<NaiveStatus>(() => {
  switch (analyzeBackendMode.value) {
    case "mock":
      return "warning";
    case "proxy":
      return "success";
    default:
      return "default";
  }
});

const statusLabel = computed(() => {
  switch (status.value) {
    case "submitting":
      return "処理中";
    case "success":
      return "成功";
    case "error":
      return "要確認";
    default:
      return "待機中";
  }
});

const statusHeading = computed(() => {
  switch (status.value) {
    case "submitting":
      return "リクエストを送信しています";
    case "success":
      return "レスポンスを取得しました";
    case "error":
      return "エラーが発生しました";
    default:
      return "送信準備完了";
  }
});

const statusAlertType = computed<NaiveStatus>(() => {
  switch (status.value) {
    case "submitting":
      return "info";
    case "success":
      return "success";
    case "error":
      return "error";
    default:
      return "default";
  }
});

const modeDescription = computed(() =>
  mode.value === "sample"
    ? "AccentIR の固定サンプルから SSML を組み立てて、Voice や音素表記の差分を素早く確認できます。"
    : "任意の日本語テキストを Analyze API に送り、返ってきた SSML をそのまま Azure に流して確認できます。"
);

const resultHint = computed(() =>
  mode.value === "sample"
    ? "サンプルを読み込むと SSML が更新されます。必要なら直接編集してから Azure に送信できます。"
    : "Analyze で生成した SSML はこのエディタに入ります。必要なら微調整後に Azure へ送信できます。"
);

const replaceAudioUrl = (nextAudioUrl: string | null) => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
  }

  audioUrl.value = nextAudioUrl;
};

const resetTransientState = () => {
  status.value = "idle";
  statusText.value = "";
  analyzeBackendMode.value = "unknown";
  replaceAudioUrl(null);
};

const applySampleResult = () => {
  const result = buildSampleSSML(
    selectedSampleId.value,
    voice.value || DEFAULT_VOICE,
    azurePhonemeAlphabet.value
  );

  ssml.value = result.ssml;
  generationWarnings.value = result.warnings;
  latestAccentIR.value = result.accentIR;
  latestRawTokens.value = [...result.rawTokens];
  appliedSampleState.value = {
    sampleId: selectedSampleId.value,
    voice: voice.value || DEFAULT_VOICE,
    azurePhonemeAlphabet: azurePhonemeAlphabet.value,
  };
  resetTransientState();
};

const updateSubscriptionKey = (value: string) => {
  subscriptionKey.value = value;
  writeSessionValue(SESSION_KEYS.subscriptionKey, value);
};

const updateRegion = (value: string) => {
  region.value = value;
  writeSessionValue(SESSION_KEYS.region, value);
};

const updateVoice = (value: string) => {
  voice.value = value;
  writeSessionValue(SESSION_KEYS.voice, value);
};

const updateOutputFormat = (value: string | null) => {
  if (typeof value !== "string") {
    return;
  }

  outputFormat.value = value;
  writeSessionValue(SESSION_KEYS.outputFormat, value);
};

const updateAzurePhonemeAlphabet = (value: string | null) => {
  if (typeof value !== "string") {
    return;
  }

  const nextValue = readAzurePhonemeAlphabet(value);
  azurePhonemeAlphabet.value = nextValue;
  writeSessionValue(SESSION_KEYS.azurePhonemeAlphabet, nextValue);
};

const handleClearCredentials = () => {
  subscriptionKey.value = "";
  region.value = DEFAULT_REGION;
  voice.value = DEFAULT_VOICE;
  outputFormat.value = DEFAULT_OUTPUT_FORMAT;
  azurePhonemeAlphabet.value = DEFAULT_AZURE_PHONEME_ALPHABET;

  writeSessionValue(SESSION_KEYS.subscriptionKey, "");
  writeSessionValue(SESSION_KEYS.region, DEFAULT_REGION);
  writeSessionValue(SESSION_KEYS.voice, DEFAULT_VOICE);
  writeSessionValue(SESSION_KEYS.outputFormat, DEFAULT_OUTPUT_FORMAT);
  writeSessionValue(
    SESSION_KEYS.azurePhonemeAlphabet,
    DEFAULT_AZURE_PHONEME_ALPHABET
  );
};

const handleSynthesize = async () => {
  if (!subscriptionKey.value || !region.value) {
    status.value = "error";
    statusText.value = "Azure の subscription key と region を入力してください。";
    return;
  }

  status.value = "submitting";
  statusText.value = "Azure TTS に送信しています...";

  try {
    const response = await fetch("/api/azure/synthesize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscriptionKey: subscriptionKey.value,
        region: region.value,
        ssml: ssml.value,
        outputFormat: outputFormat.value,
      }),
    });

    if (!response.ok) {
      status.value = "error";
      statusText.value = await readErrorMessage(response);
      replaceAudioUrl(null);
      return;
    }

    const audioBlob = await response.blob();
    const nextAudioUrl = URL.createObjectURL(audioBlob);

    replaceAudioUrl(nextAudioUrl);
    status.value = "success";
    statusText.value = `音声生成に成功しました。(${audioBlob.type || "audio"})`;
  } catch (error) {
    status.value = "error";
    statusText.value =
      error instanceof Error ? error.message : "音声生成に失敗しました。";
    replaceAudioUrl(null);
  }
};

const handleAnalyzeText = async () => {
  if (!freeText.value.trim()) {
    status.value = "error";
    statusText.value = "解析する日本語テキストを入力してください。";
    return;
  }

  status.value = "submitting";
  statusText.value = "Analyze API に送信しています...";
  analyzeBackendMode.value = "unknown";

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: freeText.value,
        locale: "ja-JP",
        voice: voice.value || DEFAULT_VOICE,
        includeDebug: true,
        azurePhonemeAlphabet: azurePhonemeAlphabet.value,
      }),
    });
    const responseBackendMode = readAnalyzeBackendMode(response);

    if (!response.ok) {
      analyzeBackendMode.value = responseBackendMode;
      status.value = "error";
      statusText.value = await readErrorMessage(response);
      return;
    }

    const payload = readAnalyzeResponse(await response.json());

    analyzeBackendMode.value = responseBackendMode;
    ssml.value = payload.azureSSML;
    generationWarnings.value = payload.warnings;
    latestAccentIR.value = payload.accentIR;
    latestRawTokens.value = payload.rawTokens;
    replaceAudioUrl(null);
    status.value = "success";
    statusText.value = "Analyze API から SSML を取得しました。";
  } catch (error) {
    status.value = "error";
    statusText.value =
      error instanceof Error ? error.message : "解析に失敗しました。";
  }
};

onBeforeUnmount(() => {
  replaceAudioUrl(null);
});
</script>

<template>
  <n-config-provider
    :theme="darkTheme"
    :theme-overrides="themeOverrides"
  >
    <n-global-style />
    <div class="app-shell">
      <div class="app-body">
        <n-space
          vertical
          size="large"
        >
          <n-card
            class="hero-card"
            :bordered="false"
          >
            <div class="hero-grid">
              <div class="hero-copy">
                <p class="eyebrow">
                  Japanese TTS Analyzer
                </p>
                <h1 class="hero-title">
                  Azure SSML Playground
                </h1>
                <n-text
                  depth="2"
                  class="hero-description"
                >
                  `AccentIR -&gt; Azure SSML` を検証するための確認画面です。credential は
                  `sessionStorage` のみで保持し、現在の SSML をそのまま Azure TTS に送信します。
                </n-text>
              </div>

              <n-grid
                class="metric-grid"
                cols="1 s:2 m:2"
                responsive="screen"
                :x-gap="12"
                :y-gap="12"
              >
                <n-gi
                  v-for="metric in metrics"
                  :key="metric.label"
                >
                  <div class="metric-shell">
                    <n-statistic
                      :label="metric.label"
                      :value="metric.value"
                    />
                  </div>
                </n-gi>
              </n-grid>
            </div>
          </n-card>

          <div class="workspace-grid">
            <aside class="sidebar">
              <n-card
                class="panel-card"
                title="接続と出力設定"
                :bordered="false"
              >
                <template #header-extra>
                  <n-tag
                    round
                    size="small"
                    :type="hasCredentials ? 'success' : 'default'"
                  >
                    {{ hasCredentials ? "Azure 送信可" : "Azure 未設定" }}
                  </n-tag>
                </template>

                <n-space
                  vertical
                  size="large"
                >
                  <n-text depth="2">
                    よく触る設定をまとめています。sample mode では Voice と音素表記を変えたあと
                    「サンプルを SSML に反映」を押すとプレビューが更新されます。
                  </n-text>

                  <n-form
                    label-placement="top"
                    size="large"
                  >
                    <n-space
                      vertical
                      size="medium"
                    >
                      <n-form-item label="Subscription Key">
                        <n-input
                          :value="subscriptionKey"
                          type="password"
                          show-password-on="click"
                          placeholder="Azure Speech key"
                          @update:value="updateSubscriptionKey"
                        />
                      </n-form-item>

                      <n-form-item label="Region">
                        <n-input
                          :value="region"
                          :placeholder="DEFAULT_REGION"
                          @update:value="updateRegion"
                        />
                      </n-form-item>

                      <n-form-item label="Voice">
                        <n-input
                          :value="voice"
                          :placeholder="DEFAULT_VOICE"
                          @update:value="updateVoice"
                        />
                      </n-form-item>

                      <n-form-item label="Azure phoneme">
                        <n-select
                          :value="azurePhonemeAlphabet"
                          :options="phonemeOptions"
                          @update:value="updateAzurePhonemeAlphabet"
                        />
                      </n-form-item>

                      <n-form-item label="Output format">
                        <n-select
                          :value="outputFormat"
                          :options="outputFormatOptions"
                          @update:value="updateOutputFormat"
                        />
                      </n-form-item>
                    </n-space>
                  </n-form>

                  <n-button
                    tertiary
                    block
                    @click="handleClearCredentials"
                  >
                    sessionStorage をクリア
                  </n-button>
                </n-space>
              </n-card>

              <n-card
                class="panel-card"
                title="入力モード"
                :bordered="false"
              >
                <n-space
                  vertical
                  size="large"
                >
                  <n-radio-group
                    v-model:value="mode"
                    name="playground-mode"
                    size="large"
                  >
                    <n-space
                      class="mode-switch"
                      :wrap="false"
                    >
                      <n-radio-button
                        v-for="option in modeOptions"
                        :key="option.value"
                        :value="option.value"
                        :label="option.label"
                      />
                    </n-space>
                  </n-radio-group>

                  <n-text depth="2">
                    {{ modeDescription }}
                  </n-text>

                  <n-card
                    embedded
                    size="small"
                    class="sub-card"
                  >
                    <template v-if="mode === 'sample'">
                      <div class="summary-label">
                        Current sample
                      </div>
                      <strong>{{ selectedSample.label }}</strong>
                      <p class="summary-copy">
                        {{ selectedSample.analyzeText }}
                      </p>
                    </template>
                    <template v-else>
                      <div class="summary-label">
                        Analyze runtime
                      </div>
                      <strong>{{ backendModeLabel }}</strong>
                      <p class="summary-copy">
                        free-text analyze の接続先をここで確認できます。
                      </p>
                    </template>
                  </n-card>
                </n-space>
              </n-card>
            </aside>

            <main class="content">
              <n-card
                class="panel-card"
                title="SSML を作る"
                :bordered="false"
              >
                <template #header-extra>
                  <n-tag
                    round
                    size="small"
                    :type="backendModeTagType"
                  >
                    {{ backendModeLabel }}
                  </n-tag>
                </template>

                <n-space
                  vertical
                  size="large"
                >
                  <div class="tag-row">
                    <n-tag round>
                      {{ voice || DEFAULT_VOICE }}
                    </n-tag>
                    <n-tag round>
                      {{ azurePhonemeAlphabet.toUpperCase() }}
                    </n-tag>
                    <n-tag round>
                      {{ outputFormat }}
                    </n-tag>
                  </div>

                  <n-alert
                    v-if="sampleComposerDirty"
                    type="warning"
                    title="未反映の sample 設定があります"
                  >
                    Voice / sample / phoneme の変更はまだ SSML editor に反映されていません。
                    Azure に送るのは現在の SSML editor の内容です。
                  </n-alert>

                  <template v-if="mode === 'sample'">
                    <n-grid
                      cols="1 s:1 m:2"
                      responsive="screen"
                      :x-gap="16"
                      :y-gap="16"
                    >
                      <n-gi>
                        <n-form
                          label-placement="top"
                          size="large"
                        >
                          <n-form-item label="AccentIR sample">
                            <n-select
                              v-model:value="selectedSampleId"
                              filterable
                              :options="sampleOptions"
                            />
                          </n-form-item>
                        </n-form>
                      </n-gi>

                      <n-gi>
                        <n-card
                          embedded
                          class="sub-card"
                          size="small"
                        >
                          <div class="summary-label">
                            Analyze text
                          </div>
                          <strong>{{ selectedSample.analyzeText }}</strong>
                          <p class="summary-copy">
                            {{ selectedSample.tokens.length }} token を使って SSML を生成します。
                          </p>
                        </n-card>
                      </n-gi>
                    </n-grid>

                    <n-button
                      type="primary"
                      size="large"
                      @click="applySampleResult"
                    >
                      サンプルを SSML に反映
                    </n-button>
                  </template>

                  <template v-else>
                    <n-form
                      label-placement="top"
                      size="large"
                    >
                      <n-form-item label="Analyze input text">
                        <n-input
                          v-model:value="freeText"
                          type="textarea"
                          placeholder="ここに自由入力テキストを入れて Analyze します"
                          :autosize="{ minRows: 7, maxRows: 14 }"
                        />
                      </n-form-item>
                    </n-form>

                    <n-button
                      type="primary"
                      size="large"
                      :loading="isSubmitting"
                      @click="handleAnalyzeText"
                    >
                      Analyze して SSML を生成
                    </n-button>
                  </template>
                </n-space>
              </n-card>

              <n-alert
                v-if="mode === 'free-text' && analyzeBackendMode === 'mock'"
                type="warning"
                title="Worker mock を使用中"
              >
                `ANALYZE_API_BASE_URL` が未設定のため、未登録テキストは plain text fallback
                で返ります。本番の analyze-backend と同じ結果ではありません。
              </n-alert>

              <n-alert
                v-if="mode === 'free-text' && analyzeBackendMode === 'proxy'"
                type="success"
                title="analyze-backend proxy に接続中"
              >
                free-text analyze は real analyze-backend に接続されています。`debug.rawTokens`
                が返る場合は backend 側の UniDic 解析結果です。
              </n-alert>

              <n-alert
                v-if="generationWarnings.length > 0"
                type="warning"
                title="Generation warnings"
              >
                <ul class="warning-list">
                  <li
                    v-for="warning in generationWarnings"
                    :key="`${warning.code}-${warning.segmentIndex}`"
                  >
                    <strong>{{ warning.code }}</strong>
                    <span>{{ warning.message }}</span>
                  </li>
                </ul>
              </n-alert>

              <n-card
                class="panel-card"
                title="SSML と音声確認"
                :bordered="false"
              >
                <template #header-extra>
                  <n-tag
                    round
                    size="small"
                    :type="statusAlertType"
                  >
                    {{ statusLabel }}
                  </n-tag>
                </template>

                <n-space
                  vertical
                  size="large"
                >
                  <n-alert
                    :type="statusAlertType"
                    :show-icon="status !== 'idle'"
                    :title="statusHeading"
                  >
                    {{ statusText || resultHint }}
                  </n-alert>

                  <div
                    v-if="audioUrl"
                    class="audio-shell"
                  >
                    <audio
                      :src="audioUrl"
                      controls
                      class="audio-player"
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </div>

                  <n-form
                    label-placement="top"
                    size="large"
                  >
                    <n-form-item label="SSML editor">
                      <template #feedback>
                        <span class="field-meta">{{ ssmlLineCount }} lines</span>
                      </template>
                      <n-input
                        v-model:value="ssml"
                        type="textarea"
                        :autosize="{ minRows: 16, maxRows: 28 }"
                      />
                    </n-form-item>
                  </n-form>

                  <n-button
                    type="primary"
                    size="large"
                    :loading="isSubmitting"
                    @click="handleSynthesize"
                  >
                    現在の SSML を Azure に送信
                  </n-button>
                </n-space>
              </n-card>

              <n-card
                class="panel-card"
                title="Debug"
                :bordered="false"
              >
                <n-collapse :default-expanded-names="defaultExpandedPanels">
                  <n-collapse-item
                    title="AccentIR"
                    name="accent-ir"
                  >
                    <div class="code-shell">
                      <pre
                        v-if="latestAccentIR"
                        class="json-viewer"
                      >{{ accentIRJson }}</pre>
                      <n-empty
                        v-else
                        description="sample を読み込むか free-text analyze を実行してください。"
                      />
                    </div>
                  </n-collapse-item>

                  <n-collapse-item
                    title="Raw tokens"
                    name="raw-tokens"
                  >
                    <div class="code-shell">
                      <pre
                        v-if="latestRawTokens"
                        class="json-viewer"
                      >{{ rawTokensJson }}</pre>
                      <n-empty
                        v-else
                        description="Analyze API かサンプル生成後に表示されます。"
                      />
                    </div>
                  </n-collapse-item>
                </n-collapse>
              </n-card>
            </main>
          </div>
        </n-space>
      </div>
    </div>
  </n-config-provider>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  padding: 32px 20px 48px;
}

.app-body {
  max-width: 1400px;
  margin: 0 auto;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.sidebar {
  display: grid;
  gap: 24px;
  position: sticky;
  top: 24px;
}

.content {
  display: grid;
  gap: 24px;
}

.hero-card,
.panel-card {
  background: linear-gradient(180deg, rgba(18, 27, 45, 0.9), rgba(11, 18, 34, 0.94));
  box-shadow: 0 24px 80px rgba(8, 15, 30, 0.28);
  backdrop-filter: blur(20px);
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 1fr);
  gap: 24px;
  align-items: start;
}

.hero-copy {
  min-width: 0;
}

.hero-title {
  margin: 0;
  color: #f8fafc;
  font-size: clamp(2rem, 3vw, 3.25rem);
  line-height: 1.05;
}

.hero-description {
  display: block;
  margin-top: 12px;
  line-height: 1.8;
}

.eyebrow {
  margin: 0 0 10px;
  color: #7dd3fc;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.metric-grid {
  align-self: stretch;
}

.metric-shell,
.sub-card,
.audio-shell,
.code-shell {
  background: rgba(15, 23, 42, 0.52);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 18px;
}

.metric-shell {
  padding: 16px;
  height: 100%;
}

.mode-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 100%;
}

.summary-label {
  margin-bottom: 8px;
  color: rgba(226, 232, 240, 0.6);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.summary-copy {
  margin: 8px 0 0;
  color: rgba(226, 232, 240, 0.76);
  line-height: 1.7;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.warning-list {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 10px;
}

.warning-list li {
  display: grid;
  gap: 4px;
}

.audio-shell {
  padding: 12px;
}

.audio-player {
  width: 100%;
}

.field-meta {
  display: inline-block;
  color: rgba(226, 232, 240, 0.64);
  font-size: 12px;
}

.code-shell {
  padding: 16px;
  max-height: 560px;
  overflow: auto;
}

.json-viewer {
  margin: 0;
  color: #cbd5e1;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

:deep(.n-card-header) {
  padding-bottom: 0;
}

:deep(.n-card__content) {
  padding-top: 16px;
}

:deep(.n-statistic .n-statistic-label) {
  color: rgba(226, 232, 240, 0.62);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
}

:deep(.n-statistic .n-statistic-value) {
  color: #f8fafc;
  font-weight: 700;
}

:deep(.n-radio-group .n-radio-button) {
  width: 100%;
}

:deep(.n-collapse .n-collapse-item__header-main) {
  font-weight: 700;
  color: #f8fafc;
}

:deep(.n-alert) {
  border-radius: 18px;
}

@media (max-width: 1120px) {
  .workspace-grid,
  .hero-grid {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
  }
}

@media (max-width: 640px) {
  .app-shell {
    padding: 20px 14px 32px;
  }
}
</style>
