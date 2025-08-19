{{/*
Expand the name of the chart.
*/}}
{{- define "oauth2-server.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "oauth2-server.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "oauth2-server.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "oauth2-server.labels" -}}
helm.sh/chart: {{ include "oauth2-server.chart" . }}
{{ include "oauth2-server.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "oauth2-server.selectorLabels" -}}
app.kubernetes.io/name: {{ include "oauth2-server.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "oauth2-server.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "oauth2-server.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Get the secret name for main secrets
*/}}
{{- define "oauth2-server.secretName" -}}
{{- if .Values.secrets.existingSecret }}
{{- .Values.secrets.existingSecret }}
{{- else }}
{{- include "oauth2-server.fullname" . }}
{{- end }}
{{- end }}

{{/*
Get the secret name for social login secrets
*/}}
{{- define "oauth2-server.socialSecretName" -}}
{{- if .Values.secrets.socialSecrets.existingSecret }}
{{- .Values.secrets.socialSecrets.existingSecret }}
{{- else }}
{{- printf "%s-social" (include "oauth2-server.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Get MongoDB URI
*/}}
{{- define "oauth2-server.mongodbUri" -}}
{{- if .Values.mongodb.enabled }}
{{- printf "mongodb://%s:%s@%s-mongodb:27017/%s?authSource=admin" .Values.mongodb.auth.rootUsername .Values.mongodb.auth.rootPassword  .Values.config.database.host .Values.mongodb.auth.database }}
{{- else }}
{{- if .Values.externalMongodb.auth.enabled }}
{{- printf "mongodb://%s:%s@%s:%v/%s?authSource=%s" .Values.externalMongodb.auth.username .Values.externalMongodb.auth.password .Values.externalMongodb.host .Values.externalMongodb.port .Values.externalMongodb.database .Values.externalMongodb.auth.authSource }}
{{- else }}
{{- printf "mongodb://%s:%v/%s" .Values.externalMongodb.host .Values.externalMongodb.port .Values.externalMongodb.database }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Get the image registry
*/}}
{{- define "oauth2-server.imageRegistry" -}}
{{- if .Values.global.imageRegistry }}
{{- .Values.global.imageRegistry }}
{{- else }}
{{- .Values.image.registry }}
{{- end }}
{{- end }}

{{/*
Get the frontend image registry
*/}}
{{- define "oauth2-server.frontendImageRegistry" -}}
{{- if .Values.global.imageRegistry }}
{{- .Values.global.imageRegistry }}
{{- else }}
{{- .Values.frontend.image.registry }}
{{- end }}
{{- end }}