import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { WebForm } from "@/components/ui/WebForm";

const LOGO_URI =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPCEtLSBTa3kgYmx1ZSBiYWNrZ3JvdW5kIC0tPgogIDxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iODUiIGZpbGw9IiM3ZGQzZmMiIC8+CiAgPGNpcmNsZSBjeD0iMTAwIiBjeT0iMTAwIiByPSI4NSIgZmlsbD0idXJsKCNza3lHcmFkaWVudCkiIG9wYWNpdHk9IjAuNSIgLz4KCiAgPCEtLSBHcmFzcyBncm91bmQgdW5kZXIgaG91c2UgLS0+CiAgPGVsbGlwc2UgY3g9IjEwMCIgY3k9IjE2MCIgcng9IjgwIiByeT0iMzAiIGZpbGw9IiM2NWEzMGQiIC8+CiAgPGVsbGlwc2UgY3g9IjEwMCIgY3k9IjE1OCIgcng9Ijc1IiByeT0iMjUiIGZpbGw9IiM4NGNjMTYiIG9wYWNpdHk9IjAuOCIgLz4KCiAgPCEtLSBDbGVhciwgcHJvbWluZW50IGxldHRlciBNIC0tPgogIDxnPgogICAgPCEtLSBMZWZ0IHZlcnRpY2FsIHN0cm9rZSBvZiBNIC0tPgogICAgPHJlY3QgeD0iNTUiIHk9IjcwIiB3aWR0aD0iMTgiIGhlaWdodD0iODAiIGZpbGw9IiM3ODM1MGYiIHJ4PSIzIiAvPgoKICAgIDwhLS0gUmlnaHQgdmVydGljYWwgc3Ryb2tlIG9mIE0gLS0+CiAgICA8cmVjdCB4PSIxMjciIHk9IjcwIiB3aWR0aD0iMTgiIGhlaWdodD0iODAiIGZpbGw9IiM3ODM1MGYiIHJ4PSIzIiAvPgoKICAgIDwhLS0gTGVmdCBkaWFnb25hbCBzdHJva2UgLSBjbGVhciBhbmQgYm9sZCAtLT4KICAgIDxwYXRoIGQ9Ik02NCA3MCBMNjQgNzUgTDk1IDExMCBMMTAwIDExMCBMMTAwIDEwNSBMNzMgNzUgTDczIDcwIFoiIGZpbGw9IiM5MjQwMGUiIC8+CgogICAgPCEtLSBSaWdodCBkaWFnb25hbCBzdHJva2UgLSBjbGVhciBhbmQgYm9sZCAtLT4KICAgIDxwYXRoIGQ9Ik0xMzYgNzAgTDEzNiA3NSBMMTA1IDExMCBMMTAwIDExMCBMMTAwIDEwNSBMMTI3IDc1IEwxMjcgNzAgWiIgZmlsbD0iIzkyNDAwZSIgLz4KCiAgICA8IS0tIENlbnRlciB2ZXJ0aWNhbCBzdHJva2Ugb2YgTSAtLT4KICAgIDxyZWN0IHg9IjkxIiB5PSIxMDUiIHdpZHRoPSIxOCIgaGVpZ2h0PSI0NSIgZmlsbD0iIzc4MzUwZiIgcng9IjMiIC8+CgogICAgPCEtLSBIb3VzZSByb29mIG9uIHRvcCBvZiBNIC0tPgogICAgPHBhdGggZD0iTTEwMCA1MCBMMTUwIDc1IEwxNDUgODAgTDEwMCA1OCBMNTUgODAgTDUwIDc1IFoiIGZpbGw9IiNiNDUzMDkiIC8+CiAgICA8cGF0aCBkPSJNMTAwIDUwIEwxNTAgNzUgTDE0NSA4MCBMMTAwIDU4IFoiIGZpbGw9IiM5MjQwMGUiIG9wYWNpdHk9IjAuMyIgLz4KICA8L2c+CgogIDwhLS0gRG9vciBkZXRhaWwgaW4gY2VudGVyIG9mIE0gLS0+CiAgPHJlY3QgeD0iOTMiIHk9IjEzMCIgd2lkdGg9IjE0IiBoZWlnaHQ9IjIwIiBmaWxsPSIjOTI0MDBlIiByeD0iMiIgLz4KICA8Y2lyY2xlIGN4PSIxMDMiIGN5PSIxNDAiIHI9IjEuNSIgZmlsbD0iI2Q5NzcwNiIgLz4KCiAgPCEtLSBMZWZ0IGdhcmRlbiBlbGVtZW50cyAtIGxhcmdlciwgZGVlcGVyIGdyZWVuIHRyZWVzL3BsYW50cyAtLT4KICA8Zz4KICAgIDxwYXRoIGQ9Ik0yNSAxMDAgUSAxMiA5NyA2IDEwNSBRIDAgMTEzIDIgMTIzIFEgNCAxMzMgMTQgMTM4IFEgMjQgMTQzIDM0IDEzNiBRIDQyIDEyOSA0MCAxMTggUSAzOCAxMDcgMjUgMTAwIFoiIGZpbGw9IiMxNTgwM2QiIG9wYWNpdHk9IjAuOTUiIC8+CiAgICA8cGF0aCBkPSJNMjUgMTAwIFEgMTggMTE1IDE0IDEzOCIgc3Ryb2tlPSIjMTQ1MzJkIiBzdHJva2Utd2lkdGg9IjEuMiIgb3BhY2l0eT0iMC41IiBmaWxsPSJub25lIiAvPgogICAgPHBhdGggZD0iTTIwIDExNSBRIDEwIDExMyA1IDEyMCBRIDAgMTI3IDEgMTM3IFEgMiAxNDcgMTMgMTUyIFEgMjQgMTU3IDM0IDE1MCBRIDQyIDE0MyA0MCAxMzIgUSAzOCAxMjEgMjAgMTE1IFoiIGZpbGw9IiMxNjY1MzQiIG9wYWNpdHk9IjAuOTgiIC8+CiAgICA8cGF0aCBkPSJNMjAgMTE1IFEgMTMgMTMwIDEzIDE1MiIgc3Ryb2tlPSIjMTQ1MzJkIiBzdHJva2Utd2lkdGg9IjEuMiIgb3BhY2l0eT0iMC41IiBmaWxsPSJub25lIiAvPgogICAgPHBhdGggZD0iTTM1IDEyMCBRIDMwIDExNyAyNCAxMjMgUSAxOCAxMjkgMTggMTM4IFEgMTggMTQ3IDI1IDE1MyBRIDMzIDE1OCA0MiAxNTUgUSA0OSAxNTEgNTAgMTQyIFEgNTAgMTMxIDQzIDEyNCBRIDM4IDExOSAzNSAxMjAgWiIgZmlsbD0iIzE1ODAzZCIgb3BhY2l0eT0iMC45MiIgLz4KICAgIDxwYXRoIGQ9Ik0zNSAxMjAgUSAzMiAxMzUgMzMgMTU1IiBzdHJva2U9IiMxNDUzMmQiIHN0cm9rZS13aWR0aD0iMS4yIiBvcGFjaXR5PSIwLjUiIGZpbGw9Im5vbmUiIC8+CiAgICA8cGF0aCBkPSJNMTggMTMwIFEgMTIgMTI4IDkgMTMzIFEgNiAxMzggOCAxNDMgUSAxMCAxNDggMTcgMTUwIFEgMjQgMTUyIDI4IDE0NiBRIDMwIDE0MCAyOSAxMzUgUSAyNyAxMzAgMTggMTMwIFoiIGZpbGw9IiMxNjY1MzQiIG9wYWNpdHk9IjAuODUiIC8+CiAgICA8cGF0aCBkPSJNMjUgMTA4IFEgMjAgMTA2IDE3IDExMCBRIDE0IDExNCAxNiAxMTkgUSAxOCAxMjMgMjQgMTI1IFEgMzAgMTI2IDM0IDEyMiBRIDM2IDExOCAzNSAxMTMgUSAzMyAxMDggMjUgMTA4IFoiIGZpbGw9IiMxNTgwM2QiIG9wYWNpdHk9IjAuOCIgLz4KICAgIDxwYXRoIGQ9Ik0yNSAxMDAgUSAyMiAxMTUgMTkgMTI4IFEgMTYgMTQyIDE1IDE1MiBRIDE0IDE2MCAxNiAxNjgiIHN0cm9rZT0iIzE0NTMyZCIgc3Ryb2tlLXdpZHRoPSI0LjUiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgLz4KICAgIDxwYXRoIGQ9Ik0zMCAxMTAgUSAyOCAxMjIgMjcgMTM1IFEgMjYgMTQ4IDI3IDE2MCIgc3Ryb2tlPSIjMTQ1MzJkIiBzdHJva2Utd2lkdGg9IjQiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgLz4KICAgIDxwYXRoIGQ9Ik0zNiAxMjIgUSAzNCAxMzUgMzMgMTQ4IFEgMzIgMTU4IDMzIDE2NSIgc3Ryb2tlPSIjMTQ1MzJkIiBzdHJva2Utd2lkdGg9IjMuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPgogIDwvZz4KCiAgPCEtLSBSaWdodCBnYXJkZW4gZWxlbWVudHMgLSBsYXJnZXIgZmxvd2VycyB3aXRoIGRpZmZlcmVudCBjb2xvcnMgLS0+CiAgPGc+CiAgICA8cGF0aCBkPSJNMTcwLjUgODAgUSAxNjcgNzggMTY1IDgzIFEgMTYzIDg4IDE2NiA5MiBRIDE2OSA5NSAxNzMgOTIgUSAxNzYgODggMTc0IDgzIFEgMTcyIDc4IDE3MC41IDgwIFoiIGZpbGw9IiNlYzQ4OTkiIC8+CiAgICA8cGF0aCBkPSJNMTc4IDg1IFEgMTgyIDgyIDE4NSA4NiBRIDE4OCA5MCAxODYgOTUgUSAxODQgOTkgMTc5IDk4IFEgMTc1IDk2IDE3NCA5MiBRIDE3MyA4OCAxNzggODUgWiIgZmlsbD0iI2Y0NzJiNiIgLz4KICAgIDxwYXRoIGQ9Ik0xODEgOTggUSAxODYgOTggMTg5IDEwMyBRIDE5MSAxMDggMTg4IDExMiBRIDE4NSAxMTYgMTgwIDExNCBRIDE3NiAxMTEgMTc2IDEwNiBRIDE3NiAxMDEgMTgxIDk4IFoiIGZpbGw9IiNlYzQ4OTkiIC8+CiAgICA8cGF0aCBkPSJNMTc3IDExNCBRIDE4MCAxMTkgMTc4IDEyNCBRIDE3NiAxMjkgMTcxIDEyOSBRIDE2NiAxMjcgMTY1IDEyMiBRIDE2NSAxMTcgMTY5IDExNCBRIDE3MiAxMTIgMTc3IDExNCBaIiBmaWxsPSIjZjQ3MmI2IiAvPgogICAgPHBhdGggZD0iTTE3MC41IDEyNiBRIDE2NyAxMjggMTY0IDEyNSBRIDE2MSAxMjIgMTYxIDExNyBRIDE2MiAxMTIgMTY3IDExMCBRIDE3MSAxMTAgMTc0IDExNCBRIDE3NiAxMTggMTcwLjUgMTI2IFoiIGZpbGw9IiNlYzQ4OTkiIC8+CiAgICA8cGF0aCBkPSJNMTY0IDExNCBRIDE1OSAxMTYgMTU2IDExMyBRIDE1MyAxMTAgMTU0IDEwNSBRIDE1NiAxMDAgMTYxIDk5IFEgMTY2IDk5IDE2OCAxMDMgUSAxNzAgMTA3IDE2NCAxMTQgWiIgZmlsbD0iI2Y0NzJiNiIgLz4KICAgIDxwYXRoIGQ9Ik0xNjEgOTggUSAxNTYgOTYgMTU0IDkxIFEgMTUyIDg2IDE1NSA4MiBRIDE1OCA3OCAxNjMgODAgUSAxNjcgODMgMTY5IDg4IFEgMTY5IDkzIDE2MSA5OCBaIiBmaWxsPSIjZWM0ODk5IiAvPgogICAgPHBhdGggZD0iTTE2NSA4NSBRIDE2MiA4MCAxNjUgNzUgUSAxNjkgNzEgMTc0IDczIFEgMTc4IDc2IDE3OSA4MSBRIDE3OSA4NiAxNzQgOTAgUSAxNzAgOTIgMTY1IDg1IFoiIGZpbGw9IiNmNDcyYjYiIC8+CiAgICA8Y2lyY2xlIGN4PSIxNzAuNSIgY3k9IjEwMyIgcj0iNyIgZmlsbD0iI2Q5NzcwNiIgLz4KICAgIDxjaXJjbGUgY3g9IjE3MC41IiBjeT0iMTAzIiByPSI2IiBmaWxsPSIjYjQ1MzA5IiBvcGFjaXR5PSIwLjYiIC8+CiAgICA8Y2lyY2xlIGN4PSIxNjcuNSIgY3k9IjEwMSIgcj0iMSIgZmlsbD0iIzc4MzUwZiIgb3BhY2l0eT0iMC42IiAvPgogICAgPGNpcmNsZSBjeD0iMTczLjUiIGN5PSIxMDEiIHI9IjEiIGZpbGw9IiM3ODM1MGYiIG9wYWNpdHk9IjAuNiIgLz4KICAgIDxjaXJjbGUgY3g9IjE3MC41IiBjeT0iMTA1LjUiIHI9IjEiIGZpbGw9IiM3ODM1MGYiIG9wYWNpdHk9IjAuNiIgLz4KICAgIDxjaXJjbGUgY3g9IjE2OC41IiBjeT0iMTA0IiByPSIwLjgiIGZpbGw9IiM3ODM1MGYiIG9wYWNpdHk9IjAuNSIgLz4KICAgIDxjaXJjbGUgY3g9IjE3Mi41IiBjeT0iMTA0IiByPSIwLjgiIGZpbGw9IiM3ODM1MGYiIG9wYWNpdHk9IjAuNSIgLz4KICAgIDxjaXJjbGUgY3g9IjE3MC41IiBjeT0iMTAwLjUiIHI9IjAuOCIgZmlsbD0iIzc4MzUwZiIgb3BhY2l0eT0iMC41IiAvPgogICAgPHBhdGggZD0iTTE3NiAxMjggUSAxNzIgMTI2IDE3MCAxMzEgUSAxNjggMTM1IDE3MiAxMzggUSAxNzYgMTQwIDE3OSAxMzYgUSAxODEgMTMyIDE3NiAxMjggWiIgZmlsbD0iI2E4NTVmNyIgLz4KICAgIDxwYXRoIGQ9Ik0xODIgMTMwIFEgMTg3IDEyOCAxODkgMTMzIFEgMTkxIDEzOCAxODggMTQyIFEgMTg1IDE0NSAxODEgMTQxIFEgMTc4IDEzNyAxODIgMTMwIFoiIGZpbGw9IiNjMDg0ZmMiIC8+CiAgICA8cGF0aCBkPSJNMTg0IDE0MiBRIDE4NyAxNDcgMTg1IDE1MiBRIDE4MyAxNTYgMTc4IDE1NiBRIDE3MyAxNTQgMTczIDE0OSBRIDE3MyAxNDMgMTg0IDE0MiBaIiBmaWxsPSIjYTg1NWY3IiAvPgogICAgPHBhdGggZD0iTTE3NiAxNDMgUSAxNzEgMTQ2IDE2OSAxNTEgUSAxNjcgMTU1IDE3MiAxNTcgUSAxNzcgMTU4IDE4MCAxNTMgUSAxODIgMTQ4IDE3NiAxNDMgWiIgZmlsbD0iI2MwODRmYyIgLz4KICAgIDxwYXRoIGQ9Ik0xNzMgMTM1IFEgMTcwIDEzMiAxNjcgMTM0IFEgMTY0IDEzNyAxNjUgMTQyIFEgMTY3IDE0NiAxNzIgMTQ1IFEgMTc2IDE0MiAxNzMgMTM1IFoiIGZpbGw9IiNhODU1ZjciIC8+CiAgICA8Y2lyY2xlIGN4PSIxNzciIGN5PSIxNDIiIHI9IjQuNSIgZmlsbD0iI2Y5NzMxNiIgLz4KICAgIDxjaXJjbGUgY3g9IjE3NyIgY3k9IjE0MiIgcj0iMy41IiBmaWxsPSIjZWE1ODBjIiAvPgogICAgPHBhdGggZD0iTTE3MC41IDExMCBRIDE2OSAxMjAgMTY4IDEzMiBRIDE2NyAxNDUgMTY3IDE1NSBRIDE2Ni41IDE2MiAxNjcgMTcwIiBzdHJva2U9IiMxNDUzMmQiIHN0cm9rZS13aWR0aD0iNC41IiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+CiAgICA8cGF0aCBkPSJNMTc3IDE0NyBRIDE3OCAxNTQgMTc4LjUgMTYyIFEgMTc5IDE2OCAxNzkgMTczIiBzdHJva2U9IiMxNDUzMmQiIHN0cm9rZS13aWR0aD0iNCIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPgogICAgPHBhdGggZD0iTTE2MCAxMzIgUSAxNTMgMTMwIDE1MCAxMzYgUSAxNDcgMTQyIDE0OSAxNDkgUSAxNTEgMTU2IDE1OSAxNTggUSAxNjcgMTYwIDE3MiAxNTQgUSAxNzYgMTQ4IDE3NCAxNDAgUSAxNzIgMTMzIDE2MCAxMzIgWiIgZmlsbD0iIzE2NjUzNCIgb3BhY2l0eT0iMC45NSIgLz4KICAgIDxwYXRoIGQ9Ik0xNjAgMTMyIFEgMTU1IDE0MyAxNTkgMTU4IiBzdHJva2U9IiMxNDUzMmQiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC41IiBmaWxsPSJub25lIiAvPgogICAgPHBhdGggZD0iTTE3NiAxNTAgUSAxODMgMTQ4IDE4OCAxNTMgUSAxOTMgMTU4IDE5MSAxNjUgUSAxODkgMTcyIDE4MSAxNzUgUSAxNzMgMTc3IDE2OCAxNzEgUSAxNjQgMTY1IDE2NSAxNTcgUSAxNjYgMTQ5IDE3NiAxNTAgWiIgZmlsbD0iIzE1ODAzZCIgb3BhY2l0eT0iMC45NSIgLz4KICAgIDxwYXRoIGQ9Ik0xNzYgMTUwIFEgMTgzIDE2MCAxODEgMTc1IiBzdHJva2U9IiMxNDUzMmQiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC41IiBmaWxsPSJub25lIiAvPgogICAgPGVsbGlwc2UgY3g9IjE2NCIgY3k9IjExOCIgcng9IjMuNSIgcnk9IjUiIGZpbGw9IiMxNjY1MzQiIG9wYWNpdHk9IjAuOCIgdHJhbnNmb3JtPSJyb3RhdGUoLTIwIDE2NCAxMTgpIiAvPgogICAgPHBhdGggZD0iTTE2NCAxMTIgUSAxNjMgMTE2IDE2NCAxMjIiIHN0cm9rZT0iIzE0NTMyZCIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+CiAgPC9nPgoKICA8IS0tIEJvdHRvbSBnYXJkZW4gYmVkIC8gb3JnYW5pYyBncmFzcyAtLT4KICA8Zz4KICAgIDxwYXRoIGQ9Ik00NSAxNjUgUSA0MyAxNTggNDUgMTUyIFEgNDYgMTQ4IDQ3IDE1MiBRIDQ4IDE1OCA0NiAxNjUiIHN0cm9rZT0iIzg0Y2MxNiIgc3Ryb2tlLXdpZHRoPSIyLjUiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgLz4KICAgIDxwYXRoIGQ9Ik01MCAxNjUgUSA1MiAxNTcgNTQgMTUxIFEgNTUgMTQ3IDU2IDE1MSBRIDU3IDE1OCA1NCAxNjUiIHN0cm9rZT0iI2EzZTYzNSIgc3Ryb2tlLXdpZHRoPSIyLjIiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgLz4KICAgIDxwYXRoIGQ9Ik01NSAxNjUgUSA1NCAxNjAgNTUgMTU0IFEgNTYgMTUwIDU3IDE1NCBRIDU4IDE2MCA1NiAxNjUiIHN0cm9rZT0iIzg0Y2MxNiIgc3Ryb2tlLXdpZHRoPSIyLjUiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgLz4KICAgIDxwYXRoIGQ9Ik02MCAxNjUgUSA2MSAxNTggNjAgMTUyIFEgNTkgMTQ4IDYxIDE1MyBRIDYzIDE2MCA2MSAxNjUiIHN0cm9rZT0iI2EzZTYzNSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+CiAgICA8cGF0aCBkPSJNNjUgMTY1IFEgNjQgMTYwIDY2IDE1NCBRIDY3IDE1MCA2OCAxNTQgUSA2OSAxNjAgNjcgMTY1IiBzdHJva2U9IiM4NGNjMTYiIHN0cm9rZS13aWR0aD0iMi4yIiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+CiAgICA8cGF0aCBkPSJNNzAgMTY1IFEgNzEgMTU5IDcwIDE1MyBRIDY5IDE0OSA3MSAxNTQgUSA3MyAxNjAgNzEgMTY1IiBzdHJva2U9IiNhM2U2MzUiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPgogICAgPHBhdGggZD0iTTEzMCAxNjUgUSAxMzEgMTU5IDEzMCAxNTMgUSAxMjkgMTQ5IDEzMSAxNTQgUSAxMzMgMTYwIDEzMSAxNjUiIHN0cm9rZT0iI2EzZTYzNSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+CiAgICA8cGF0aCBkPSJNMTM1IDE2NSBRIDEzNCAxNjAgMTM2IDE1NCBRIDEzNyAxNTAgMTM4IDE1NCBRIDEzOSAxNjAgMTM3IDE2NSIgc3Ryb2tlPSIjODRjYzE2IiBzdHJva2Utd2lkdGg9IjIuMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPgogICAgPHBhdGggZD0iTTE0MCAxNjUgUSAxNDEgMTU4IDE0MCAxNTIgUSAxMzkgMTQ4IDE0MSAxNTMgUSAxNDMgMTYwIDE0MSAxNjUiIHN0cm9rZT0iI2EzZTYzNSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+CiAgICA8cGF0aCBkPSJNMTQ1IDE2NSBRIDE0MyAxNTggMTQ1IDE1MiBRIDE0NiAxNDggMTQ3IDE1MiBRIDE0OCAxNTggMTQ2IDE2NSIgc3Ryb2tlPSIjODRjYzE2IiBzdHJva2Utd2lkdGg9IjIuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPgogICAgPHBhdGggZD0iTTE1MCAxNjUgUSAxNDggMTU3IDE0NiAxNTEgUSAxNDUgMTQ3IDE0NyAxNTEgUSAxNDkgMTU4IDE1MSAxNjUiIHN0cm9rZT0iI2EzZTYzNSIgc3Ryb2tlLXdpZHRoPSIyLjIiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgLz4KICAgIDxwYXRoIGQ9Ik0xNTUgMTY1IFEgMTU0IDE2MCAxNTUgMTU0IFEgMTU2IDE1MCAxNTcgMTU0IFEgMTU4IDE2MCAxNTYgMTY1IiBzdHJva2U9IiM4NGNjMTYiIHN0cm9rZS13aWR0aD0iMi41IiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+CiAgPC9nPgoKICA8IS0tIFN1biBlbGVtZW50IGluIHRvcCByaWdodCAtLT4KICA8Zz4KICAgIDxjaXJjbGUgY3g9IjE2MCIgY3k9IjQwIiByPSIxNCIgZmlsbD0iI2ZiYmYyNCIgb3BhY2l0eT0iMC42IiAvPgogICAgPGNpcmNsZSBjeD0iMTYwIiBjeT0iNDAiIHI9IjEwIiBmaWxsPSIjZmRlMDQ3IiAvPgogICAgPHBhdGggZD0iTTE2MCAyMiBRIDE1OSAxOSAxNjAgMTYiIHN0cm9rZT0iI2ZiYmYyNCIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+CiAgICA8cGF0aCBkPSJNMTc4IDQwIFEgMTgxIDM5IDE4NCA0MCIgc3Ryb2tlPSIjZmJiZjI0IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgLz4KICAgIDxwYXRoIGQ9Ik0xNzIgMjggUSAxNzUgMjUgMTc4IDIzIiBzdHJva2U9IiNmYmJmMjQiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPgogICAgPHBhdGggZD0iTTE3MiA1MiBRIDE3NSA1NSAxNzggNTciIHN0cm9rZT0iI2ZiYmYyNCIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+CiAgICA8cGF0aCBkPSJNMTQ4IDI4IFEgMTQ1IDI1IDE0MiAyMyIgc3Ryb2tlPSIjZmJiZjI0IiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPgogICAgPHBhdGggZD0iTTE0OCA1MiBRIDE0NSA1NSAxNDIgNTciIHN0cm9rZT0iI2ZiYmYyNCIgc3Ryb2tlLXdpZHRoPSIyLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgLz4KICA8L2c+CgogIDwhLS0gV2luZG93cyBvbiB0aGUgTSBzdHJ1Y3R1cmUgLS0+CiAgPHJlY3QgeD0iNjAiIHk9IjkwIiB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjNjBhNWZhIiBvcGFjaXR5PSIwLjQiIHJ4PSIxIiAvPgogIDxsaW5lIHgxPSI2NCIgeTE9IjkwIiB4Mj0iNjQiIHkyPSI5OCIgc3Ryb2tlPSIjMWU0MGFmIiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC4zIiAvPgogIDxsaW5lIHgxPSI2MCIgeTE9Ijk0IiB4Mj0iNjgiIHkyPSI5NCIgc3Ryb2tlPSIjMWU0MGFmIiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC4zIiAvPgogIDxyZWN0IHg9IjEzMiIgeT0iOTAiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiM2MGE1ZmEiIG9wYWNpdHk9IjAuNCIgcng9IjEiIC8+CiAgPGxpbmUgeDE9IjEzNiIgeTE9IjkwIiB4Mj0iMTM2IiB5Mj0iOTgiIHN0cm9rZT0iIzFlNDBhZiIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuMyIgLz4KICA8bGluZSB4MT0iMTMyIiB5MT0iOTQiIHgyPSIxNDAiIHkyPSI5NCIgc3Ryb2tlPSIjMWU0MGFmIiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC4zIiAvPgoKICA8IS0tIEdyYWRpZW50cyAtLT4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ic2t5R3JhZGllbnQiIHgxPSIxMDAiIHkxPSIxNSIgeDI9IjEwMCIgeTI9IjE4NSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNiYWU2ZmQiIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzdkZDNmYyIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgo8L3N2Zz4K";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberDevice, setRememberDevice] = useState(true);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onLogin = async (data: FormData) => {
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword(data);
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
    } else {
      await AsyncStorage.setItem(
        "@mattox_remember_device",
        rememberDevice ? "true" : "false"
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-[#FFFFED]"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        className="bg-[#FFFFED]"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-8 items-center">
          {Platform.OS === "web" ? (
            <Image
              source={{ uri: LOGO_URI }}
              style={{ width: 100, height: 100, marginBottom: 12 }}
              accessibilityLabel="Mattox Family Home Management Logo"
            />
          ) : (
            <Text style={{ fontSize: 64, marginBottom: 12 }}>🏠</Text>
          )}
          <Text className="text-2xl font-bold text-gray-900 text-center">
            Mattox Family
          </Text>
          <Text className="text-2xl font-bold text-gray-900 text-center">
            Home Management
          </Text>
          <Text className="text-gray-500 mt-1">Sign in to your account</Text>
        </View>

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-600 text-sm">{error}</Text>
          </View>
        )}

        <WebForm onSubmit={handleSubmit(onLogin)}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={errors.email?.message}
                placeholder="you@example.com"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                autoComplete="password"
                error={errors.password?.message}
                placeholder="••••••••"
              />
            )}
          />

          {/* Remember this device */}
          <TouchableOpacity
            onPress={() => setRememberDevice(!rememberDevice)}
            className="flex-row items-center mt-1 mb-4"
            activeOpacity={0.7}
          >
            <View
              className={`w-5 h-5 rounded border-2 items-center justify-center mr-3 ${
                rememberDevice
                  ? "bg-blue-600 border-blue-600"
                  : "bg-white border-gray-300"
              }`}
            >
              {rememberDevice && (
                <Text className="text-white text-xs font-bold leading-none">
                  ✓
                </Text>
              )}
            </View>
            <Text className="text-sm text-gray-600">Remember this device</Text>
          </TouchableOpacity>

          <Button
            title="Sign In"
            onPress={handleSubmit(onLogin)}
            loading={loading}
            className="mt-2"
          />
        </WebForm>

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-500">Don't have an account? </Text>
          <Text
            className="text-blue-600 font-semibold"
            onPress={() => router.push("/(auth)/signup")}
          >
            Sign up
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
