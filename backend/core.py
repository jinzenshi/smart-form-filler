import io
import json
import requests
import ast
import os
import re
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm

PROFILE_FIELD_ALIASES = {
    "姓名": ["名字", "姓名（中文）", "姓名(中文)", "name"],
    "性别": ["gender"],
    "出生日期": ["生日", "出生年月", "出生时间", "birth", "dateofbirth"],
    "身份证号": ["身份证", "身份证号码", "证件号码", "id", "idcard"],
    "手机号码": ["手机号", "手机", "电话", "联系电话", "联系方式", "mobile", "phone"],
    "电子邮箱": ["邮箱", "邮件", "email", "e-mail"],
    "毕业院校": ["毕业学校", "学校", "院校", "高校", "university", "college"],
    "学历": ["教育程度", "education", "degree"],
    "专业": ["所学专业", "major"],
    "毕业时间": ["毕业日期", "graduation", "graduationdate"],
    "应聘岗位": ["应聘职位", "求职岗位", "职位", "岗位", "position", "jobtitle"],
    "期望城市": ["意向城市", "目标城市", "求职城市", "expectedcity"],
    "现居住地": ["现居", "居住地", "居住地址", "地址", "address", "location"],
    "政治面貌": ["政治身份"],
    "紧急联系人": ["联系人", "紧急联络人", "emergencycontact"],
    "紧急联系人电话": ["紧急联系人手机号", "紧急联系电话", "emergencyphone"],
}

PROFILE_KEY_NOISE_TOKENS = [
    "必填",
    "选填",
    "必选",
    "可选",
    "required",
    "optional",
    "请填写",
    "请输入",
]


def _normalize_profile_key(key):
    cleaned = re.sub(r"[\s_\-（）()【】\[\]·.]+", "", key or "")
    cleaned = cleaned.lower()
    for token in PROFILE_KEY_NOISE_TOKENS:
        cleaned = cleaned.replace(token, "")
    return cleaned.strip()


def _extract_profile_pairs(user_info_text):
    parsed_fields = {}
    for raw_line in (user_info_text or "").splitlines():
        line = raw_line.strip()
        if not line:
            continue

        line = re.sub(r"^[-*•·]+\s*", "", line)
        line = re.sub(r"^\d+[.)、]\s*", "", line)

        if not re.search(r"[：:=]", line):
            continue

        parts = re.split(r"[：:=]", line, maxsplit=1)
        if len(parts) != 2:
            continue

        key = parts[0].strip()
        value = parts[1].strip().strip('"\'')
        if not key or not value:
            continue

        normalized_key = _normalize_profile_key(key)
        if normalized_key and normalized_key not in parsed_fields:
            parsed_fields[normalized_key] = value

    return parsed_fields


def _collect_explicit_profile_values(user_info_text):
    explicit_values = set()
    for value in _extract_profile_pairs(user_info_text).values():
        normalized_value = re.sub(r"\s+", "", str(value or ""))
        if normalized_value:
            explicit_values.add(normalized_value)
    return explicit_values


def _is_explicit_value(value, explicit_values, raw_text=""):
    normalized_value = re.sub(r"\s+", "", str(value or "")).strip()
    if not normalized_value:
        return False

    if normalized_value in explicit_values:
        return True

    # 允许短语包含关系（例如 "上海" vs "上海市浦东新区"）
    if len(normalized_value) <= 1:
        return False

    for explicit in explicit_values:
        if len(explicit) <= 1:
            continue
        if normalized_value in explicit or explicit in normalized_value:
            return True

    # 回退检查：在原始用户文本中直接搜索（去除空格后匹配）
    # 解决 PDF 提取的流式文本无法被解析为 key:value 对的问题
    if raw_text:
        normalized_raw = re.sub(r"\s+", "", raw_text)
        if len(normalized_value) >= 2 and normalized_value in normalized_raw:
            return True

    return False


def build_profile_reuse_context(user_info_text):
    if not user_info_text:
        return user_info_text

    if "## 标准化资料映射（系统自动生成，用于跨模板复用）" in user_info_text:
        return user_info_text

    parsed_fields = _extract_profile_pairs(user_info_text)
    if not parsed_fields:
        return user_info_text

    canonical_pairs = []
    for canonical, aliases in PROFILE_FIELD_ALIASES.items():
        candidates = [canonical] + aliases
        matched_value = None
        for candidate in candidates:
            candidate_key = _normalize_profile_key(candidate)
            if candidate_key in parsed_fields:
                matched_value = parsed_fields[candidate_key]
                break

        if matched_value:
            canonical_pairs.append((canonical, matched_value))

    if not canonical_pairs:
        return user_info_text

    augmented_lines = ["", "## 标准化资料映射（系统自动生成，用于跨模板复用）"]
    augmented_lines.extend([f"{k}：{v}" for k, v in canonical_pairs])
    return user_info_text.rstrip() + "\n" + "\n".join(augmented_lines)

def analyze_missing_fields(docx_bytes, user_info_text):
    """
    分析模板和个人信息，返回可能缺失的字段列表

    Args:
        docx_bytes: Word文档字节数据
        user_info_text: 用户信息文本

    Returns:
        list: 缺失的字段名称列表
    """
    from docx import Document

    doc = Document(io.BytesIO(docx_bytes))
    normalized_user_info_text = build_profile_reuse_context(user_info_text)

    # 1. 收集表格的表头和占位符信息
    placeholder_info = {}  # {占位符: 表格位置描述}
    all_headers = []  # 所有表头文本

    for t_idx, table in enumerate(doc.tables):
        if not table.rows:
            continue

        # 获取表头行
        header_row = table.rows[0]
        headers = []
        for c_idx, cell in enumerate(header_row.cells):
            headers.append(cell.text.strip())

        # 收集表头信息
        for h_idx, header in enumerate(headers):
            if header and header not in all_headers:
                all_headers.append(header)

        # 标记空单元格并记录位置
        max_cols = max(len(row.cells) for row in table.rows)
        counter = 1

        for r_idx, row in enumerate(table.rows):
            for c_idx in range(max_cols):
                if c_idx >= len(row.cells):
                    continue

                cell = row.cells[c_idx]
                text = cell.text.strip()

                if not text:
                    # 为空单元格创建占位符
                    tag = f"{{{counter}}}"
                    # 尝试找到这个占位符对应的表头
                    header = headers[c_idx] if c_idx < len(headers) else ""
                    placeholder_info[tag] = {
                        "header": header,
                        "table_index": t_idx + 1,
                        "row_index": r_idx + 1,
                        "col_index": c_idx + 1
                    }
                    counter += 1

    if not placeholder_info:
        return []

    # 2. 调用 AI 分析缺失的字段
    # 将表格信息和用户信息一起发给 AI，让它推断需要哪些字段
    headers_text = "\n".join([f"- {h}" for h in all_headers if h])
    placeholders_text = "\n".join([f"- {k}: 表头={v['header'] if v['header'] else '无'}" for k, v in placeholder_info.items()])

    url = "https://api-inference.modelscope.cn/v1/chat/completions"
    api_key = os.environ.get("MODELSCOPE_API_KEY", "")
    model_endpoint = os.environ.get("MODEL_ENDPOINT") or "deepseek-ai/DeepSeek-V3.2"

    prompt = f"""你是一个表单字段分析助手。请仔细分析表格中的空单元格和个人信息，找出哪些字段在个人信息中没有明确提供。

**任务：**
1. 找出表格中所有空单元格对应的字段名称（根据表头或列位置判断）
2. 逐个检查这些字段是否在【用户已填写的信息】中有明确的值
3. 如果某个字段在个人信息中没有明确提供，就加入缺失列表

**重要规则：**
- 不能通过推理或猜测来填充的字段，必须报告为缺失
- 即使可以通过常理推断的字段（如家庭成员的政治面貌），如果个人信息中没有明确写出，也必须报告为缺失
- 照片、签名等无法通过文字提供的字段，也需要报告

**模板表格的空单元格字段：**
{placeholders_text}

**用户已填写的信息：**
{normalized_user_info_text}

**返回格式：**
请以纯 JSON 数组格式返回，只列出缺失的字段名称，示例：
["小一寸彩色近照", "家庭成员政治面貌", "家庭成员联系电话"]

只返回字段名称数组，不要其他解释。"""

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    data = {
        "model": model_endpoint,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,  # 较低温度使结果更稳定
        "top_p": 0.7,
        "max_tokens": 500
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        if response.status_code != 200:
            print(f"❌ AI API 返回错误状态码: {response.status_code}")
            return []

        res_json = response.json()
        content = res_json['choices'][0]['message']['content']

        print(f"📝 AI 返回内容: {content[:500]}...")

        # 清理 Markdown 代码块标记
        content = content.replace("```json", "").replace("```", "").strip()

        # 解析 JSON 数组
        try:
            missing_fields = json.loads(content)
            if isinstance(missing_fields, list):
                print(f"✅ 解析到缺失字段: {missing_fields}")
                return missing_fields
            print(f"⚠️ 解析结果不是数组: {missing_fields}")
            return []
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON 解析失败: {e}，尝试正则提取")
            # 尝试提取数组格式
            import re
            matches = re.findall(r'"([^"]+)"', content)
            if matches:
                print(f"✅ 正则提取到缺失字段: {matches}")
                return matches
            print(f"⚠️ 正则提取失败，原始内容: {content[:200]}")
            return []
    except Exception as e:
        print(f"❌ 分析缺失字段失败: {e}")
        return []


def audit_template(docx_bytes, user_info_text):
    """
    审核模板变量与个人信息的匹配情况

    Args:
        docx_bytes: Word文档字节数据
        user_info_text: 用户信息文本

    Returns:
        dict: {
            "success": bool,
            "items": [{"key": str, "label": str, "value": str, "isMatched": bool}],
            "matched_count": int,
            "missing_count": int
        }
    """
    from docx import Document

    doc = Document(io.BytesIO(docx_bytes))
    normalized_user_info_text = build_profile_reuse_context(user_info_text)

    # 1. 收集占位符和表头信息，构建 Markdown 表格
    placeholder_info = {}  # {占位符: {"header": str, "table_index": int, "row_index": int, "col_index": int}}
    markdown_lines = []

    for t_idx, table in enumerate(doc.tables):
        if not table.rows:
            continue

        markdown_lines.append(f"\n### 表格 {t_idx + 1}\n")

        # 获取表头行
        header_row = table.rows[0]
        headers = []
        for c_idx, cell in enumerate(header_row.cells):
            headers.append(cell.text.strip())

        # 预计算最大列数
        max_cols = max(len(row.cells) for row in table.rows)

        for r_idx, row in enumerate(table.rows):
            row_cells_content = []
            for c_idx in range(max_cols):
                if c_idx >= len(row.cells):
                    row_cells_content.append("")
                    continue

                cell = row.cells[c_idx]
                text = cell.text.strip()

                if not text:
                    # 空单元格作为占位符
                    tag = f"{{{len(placeholder_info) + 1}}}"
                    # 获取表头
                    header = headers[c_idx] if c_idx < len(headers) else ""
                    placeholder_info[tag] = {
                        "header": header,
                        "table_index": t_idx + 1,
                        "row_index": r_idx + 1,
                        "col_index": c_idx + 1
                    }
                    row_cells_content.append(tag)
                else:
                    row_cells_content.append(text)

            # 生成 Markdown 行
            markdown_lines.append("| " + " | ".join(row_cells_content) + " |")
            if r_idx == 0:
                markdown_lines.append("| " + " | ".join(["---"] * max_cols) + " |")

    if not placeholder_info:
        return {"success": True, "items": [], "matched_count": 0, "missing_count": 0}

    # 2. 调用 AI 分析匹配情况
    url = "https://api-inference.modelscope.cn/v1/chat/completions"
    api_key = os.environ.get("MODELSCOPE_API_KEY", "")
    model_endpoint = os.environ.get("MODEL_ENDPOINT") or "deepseek-ai/DeepSeek-V3.2"

    # 构建占位符信息文本
    placeholders_text = "\n".join([
        f"- {k}: 表头=\"{v['header'] if v['header'] else '无'}\" (表格{v['table_index']}第{v['row_index']}行第{v['col_index']}列)"
        for k, v in placeholder_info.items()
    ])

    prompt = f"""你是一个表单匹配审核助手。请分析以下模板表格和个人信息，检查每个占位符是否能在个人信息中找到对应值。

**任务：**
1. 从模板表格中提取所有占位符及其含义（根据表头判断）
2. 在用户信息中搜索每个占位符对应的值
3. 如果找到对应值，标记为匹配；如果找不到，标记为缺失

**模板表格的占位符信息：**
{placeholders_text}

**Markdown表格上下文：**
{"".join(markdown_lines)}

**用户已填写的信息：**
{normalized_user_info_text}

**返回格式：**
请以纯 JSON 格式返回，示例：
{{
  "items": [
    {{"key": "{{1}}", "label": "姓名", "value": "张三", "isMatched": true}},
    {{"key": "{{2}}", "label": "期望薪资", "value": "", "isMatched": false}}
  ]
}}

只返回 JSON，不要其他解释。"""

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    data = {
        "model": model_endpoint,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "top_p": 0.7,
        "max_tokens": 2000
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        if response.status_code != 200:
            print(f"❌ AI API 返回错误: {response.status_code}")
            return {"success": False, "error": f"API error: {response.status_code}", "items": []}

        res_json = response.json()
        content = res_json['choices'][0]['message']['content']

        # 清理 Markdown 代码块
        content = content.replace("```json", "").replace("```", "").strip()

        # 解析 JSON
        result = json.loads(content)
        items = result.get("items", [])

        # 确保返回所有占位符（AI 可能遗漏）
        returned_keys = {item.get("key") for item in items}
        for tag, info in placeholder_info.items():
            if tag not in returned_keys:
                items.append({
                    "key": tag,
                    "label": info["header"] if info["header"] else tag,
                    "value": "",
                    "isMatched": False
                })

        matched_count = sum(1 for item in items if item.get("isMatched"))
        missing_count = len(items) - matched_count

        return {
            "success": True,
            "items": items,
            "matched_count": matched_count,
            "missing_count": missing_count
        }

    except json.JSONDecodeError as e:
        print(f"❌ JSON 解析失败: {e}, 内容: {content[:200]}")
        return {"success": False, "error": f"JSON parse error: {str(e)}", "items": []}
    except Exception as e:
        print(f"❌ 审核模板失败: {e}")
        return {"success": False, "error": str(e), "items": []}


def get_modelscope_response(user_info, markdown_context):
    """
    参考 smart.py 的提示词思路，使用 Markdown 表格作为上下文
    """
    if isinstance(user_info, bytes):
        user_info = user_info.decode('utf-8')

    url = "https://api-inference.modelscope.cn/v1/chat/completions"
    api_key = os.environ.get("MODELSCOPE_API_KEY", "")
    model_endpoint = os.environ.get("MODEL_ENDPOINT") or "deepseek-ai/DeepSeek-V3.2"

    # 参考 smart.py 的提示词构建方式
    prompt = f"""你是一个专业的占位符替换助手。请分析以下 Markdown 表格和个人信息，输出每个占位符应填内容。

**任务要求：**
1. 仅基于【个人信息】中明确出现的内容进行填写，不得编造、不得脑补。
2. 仔细分析表格中的占位符格式（如 {{1}}、{{2}} 等），以及其所在行列上下文。
3. 如果无法确定某个占位符的内容，必须返回空字符串 ""。
4. 返回格式必须是纯 JSON，格式为：{{"{{1}}": "内容", "{{2}}": "内容"}}。
5. 返回值必须是简洁字段值，不要输出解释句、原因或多余前后缀。

**个人信息：**
{user_info}

**Markdown表格上下文：**
{markdown_context}

**注意：**
- 只返回需要替换的占位符映射。
- 确保 JSON 格式正确，不要包含额外的解释性文字。"""

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    data = {
        "model": model_endpoint, 
        "messages": [{"role": "user", "content": prompt}], 
        "temperature": 0.2,
        "top_p": 0.3,
        "extra_body": {"enable_thinking": True}
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        if response.status_code != 200:
            return {}

        res_json = response.json()
        content = res_json['choices'][0]['message']['content']

        # 清理 Markdown 代码块标记 (参考 smart.py 的解析逻辑)
        content = content.replace("```json", "").replace("```", "").strip()

        # 更鲁棒的 JSON 提取逻辑
        try:
            fill_data = json.loads(content)
        except json.JSONDecodeError:
            try:
                # 尝试匹配第一个 { 和最后一个 }
                match = re.search(r'\{.*\}', content, re.DOTALL)
                if match:
                    extracted_json = match.group(0)
                    print(f"📝 提取到 JSON: {extracted_json[:100]}...")
                    fill_data = json.loads(extracted_json)
                else:
                    print("⚠️ 未找到 JSON 格式内容")
                    fill_data = {}
            except (json.JSONDecodeError, AttributeError) as e:
                print(f"❌ JSON 解析失败: {e}")
                try:
                    fill_data = ast.literal_eval(content)
                except:
                    print("❌ 所有 JSON 解析方法都失败")
                    fill_data = {}

        # 结果归一化：仅保留占位符键，并清理疑似解释性文本
        normalized_fill_data = {}
        for key, value in (fill_data or {}).items():
            if not isinstance(key, str):
                continue

            normalized_key = key if key.startswith("{") else f"{{{key}}}"
            if not re.match(r"^\{\d+\}$", normalized_key):
                continue

            normalized_value = "" if value is None else str(value).strip()
            if any(token in normalized_value for token in ["无法确定", "未提供", "未知", "根据提供信息", "推断"]):
                normalized_value = ""

            normalized_fill_data[normalized_key] = normalized_value

        # 打印 fill_data 供 server_with_auth.py 记录
        print(f"📋 AI 生成的填充数据: {normalized_fill_data}")
        return normalized_fill_data
    except Exception as e:
        print(f"❌ Error during AI inference: {e}")
        return {}

def _get_table_default_font(table):
    """获取表格的默认字体格式（从第一个有格式的非空单元格提取）"""
    default_font_name = None
    default_font_size = None
    for row in table.rows:
        for cell in row.cells:
            for paragraph in cell.paragraphs:
                if paragraph.runs:
                    run = paragraph.runs[0]
                    if run.font.name:
                        default_font_name = run.font.name
                    if run.font.size:
                        default_font_size = run.font.size
                    if default_font_name or default_font_size:
                        return default_font_name, default_font_size
    return default_font_name, default_font_size


def _replace_cell_text_preserve_format(cell, new_text, default_font_name=None, default_font_size=None):
    """
    替换单元格文本，保持原有格式。
    借鉴 fill_template.py 的思路：保存 run 格式 → 删除旧 run → 创建新 run → 恢复格式。
    """
    for paragraph in cell.paragraphs:
        # 1. 保存第一个 run 的格式
        first_run_format = None
        if paragraph.runs:
            first_run = paragraph.runs[0]
            first_run_format = {
                'name': first_run.font.name,
                'size': first_run.font.size,
                'bold': first_run.font.bold,
                'italic': first_run.font.italic,
                'underline': first_run.font.underline,
            }

        # 2. 删除所有 run（保留段落本身的属性如对齐方式）
        for run in list(paragraph.runs):
            r = run._element
            r.getparent().remove(r)

        # 3. 添加新 run 并恢复格式
        new_run = paragraph.add_run(new_text)

        if first_run_format:
            if first_run_format['name']:
                new_run.font.name = first_run_format['name']
            if first_run_format['size']:
                new_run.font.size = first_run_format['size']
            if first_run_format['bold'] is not None:
                new_run.font.bold = first_run_format['bold']
            if first_run_format['italic'] is not None:
                new_run.font.italic = first_run_format['italic']
            if first_run_format['underline'] is not None:
                new_run.font.underline = first_run_format['underline']
        elif default_font_name or default_font_size:
            # 没有原格式时使用表格默认格式
            if default_font_name:
                new_run.font.name = default_font_name
            if default_font_size:
                new_run.font.size = default_font_size

        # 只处理第一个段落
        break


def fill_form(docx_bytes, user_info_text, photo_bytes, return_fill_data=False, prefilled_data=None, return_metadata=False):
    """
    填充表单

    Args:
        docx_bytes: Word文档字节数据
        user_info_text: 用户信息文本
        photo_bytes: 照片字节数据
        return_fill_data: 是否返回填充数据（用于减少重复推理）
        prefilled_data: 可选，直接使用预览阶段返回的填充数据，避免重复 AI 推理

    Returns:
        如果 return_fill_data=True，返回 (output_bytes, fill_data, missing_fields)
        其中 missing_fields 是缺失字段的表头/位置信息列表
        否则返回 output_bytes
    """
    doc = Document(io.BytesIO(docx_bytes))
    normalized_user_info_text = build_profile_reuse_context(user_info_text)
    explicit_profile_values = _collect_explicit_profile_values(normalized_user_info_text)

    # 1. 处理照片占位符
    photo_coords = []
    for t_idx, table in enumerate(doc.tables):
        for r_idx, row in enumerate(table.rows):
            for c_idx, cell in enumerate(row.cells):
                text_lower = cell.text.lower()
                if any(k in text_lower for k in ["照片", "相片", "证件照"]):
                    photo_coords.append((t_idx, r_idx, c_idx))

    if photo_coords and photo_bytes:
        for (t_idx, r_idx, c_idx) in photo_coords:
            cell = doc.tables[t_idx].rows[r_idx].cells[c_idx]
            cell.text = ""
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = p.add_run()
            run.add_picture(io.BytesIO(photo_bytes), width=Cm(3.5))

    # 2. 标记空单元格并构建 Markdown 上下文 (集成 smart.py 核心思路)
    placeholder_map = {}
    placeholder_info = {}  # 存储占位符对应的表头信息
    table_default_fonts = {}  # 存储每个表格的默认字体 {t_idx: (font_name, font_size)}
    counter = 1
    markdown_lines = []

    for t_idx, table in enumerate(doc.tables):
        markdown_lines.append(f"\n### 表格 {t_idx + 1}\n")

        # 提取表格默认字体（用于空单元格的格式回退）
        table_default_fonts[t_idx] = _get_table_default_font(table)

        # 预计算当前表格的最大列数
        max_cols = max(len(row.cells) for row in table.rows) if table.rows else 0

        for r_idx, row in enumerate(table.rows):
            row_cells_content = []
            for c_idx in range(max_cols):
                # 越界处理
                if c_idx >= len(row.cells):
                    row_cells_content.append("")
                    continue

                cell = row.cells[c_idx]

                # 跳过已标记为照片的单元格
                if (t_idx, r_idx, c_idx) in photo_coords:
                    row_cells_content.append("[照片]")
                    continue

                text = cell.text.strip()
                if not text:
                    # 为空单元格创建占位符
                    tag = f"{{{counter}}}"
                    # 使用格式保持的方式写入占位符标记
                    _replace_cell_text_preserve_format(
                        cell, tag,
                        table_default_fonts[t_idx][0],
                        table_default_fonts[t_idx][1]
                    )
                    placeholder_map[tag] = cell
                    # 获取表头信息
                    header = ""
                    if r_idx > 0 and c_idx < len(table.rows[0].cells):
                        header_cell = table.rows[0].cells[c_idx]
                        header = header_cell.text.strip()
                    # 保存占位符信息，包括表头和位置
                    placeholder_info[tag] = {
                        "header": header,
                        "table_index": t_idx + 1,
                        "row_index": r_idx + 1,
                        "col_index": c_idx + 1
                    }
                    row_cells_content.append(tag)
                    counter += 1
                else:
                    row_cells_content.append(text)
            
            # 生成 Markdown 行
            markdown_lines.append("| " + " | ".join(row_cells_content) + " |")
            if r_idx == 0: # 添加分割线
                markdown_lines.append("| " + " | ".join(["---"] * max_cols) + " |")

    if not placeholder_map:
        out = io.BytesIO()
        doc.save(out)
        output_bytes = out.getvalue()
        if return_fill_data:
            if return_metadata:
                return output_bytes, {}, [], {"low_confidence_fields": []}
            return output_bytes, {}, []
        return output_bytes

    # 3. 获取填充数据（优先使用预览阶段传回的数据，避免重复 AI 推理）
    if prefilled_data is not None:
        fill_data = prefilled_data
    else:
        fill_data = get_modelscope_response(normalized_user_info_text, "\n".join(markdown_lines))

    if not isinstance(fill_data, dict):
        fill_data = {}

    # 4. 收集未填充的字段信息
    missing_fields = []
    missing_fields_seen = set()
    placeholder_needs_ai_inference = {}
    resolved_placeholders = set()
    low_confidence_keys = set()

    def get_display_field_name(target_key, inferred_fields_map=None):
        header_info = placeholder_info.get(target_key, {})
        header = (header_info.get("header") or "").strip()
        if header:
            return header
        if inferred_fields_map and target_key in inferred_fields_map:
            candidate = str(inferred_fields_map[target_key]).strip()
            if candidate:
                return candidate
        return target_key

    def register_missing(target_key):
        header_info = placeholder_info.get(target_key, {})
        header = (header_info.get("header") or "").strip()
        if header:
            if header not in missing_fields_seen:
                missing_fields.append(header)
                missing_fields_seen.add(header)
        else:
            pos_info = placeholder_info.get(target_key)
            if pos_info and target_key not in placeholder_needs_ai_inference:
                placeholder_needs_ai_inference[target_key] = {
                    "table_index": pos_info.get("table_index", 0),
                    "row_index": pos_info.get("row_index", 0),
                    "col_index": pos_info.get("col_index", 0),
                }
        print(f"⚠️ 识别到缺失字段: {header if header else target_key} (占位符: {target_key})")

    # 4. 填充数据（使用格式保持的替换方式）
    for key, value in list(fill_data.items()):
        # 兼容 AI 返回 "1" 而不是 "{1}" 的情况
        target_key = key if key.startswith("{") else f"{{{key}}}"
        if target_key in placeholder_map:
            resolved_placeholders.add(target_key)
            cell = placeholder_map[target_key]

            normalized_value = "" if value is None else str(value).strip()
            if normalized_value and not _is_explicit_value(normalized_value, explicit_profile_values, normalized_user_info_text):
                print(f"⚠️ 低置信度值已清空: {target_key} -> {normalized_value}")
                low_confidence_keys.add(target_key)
                normalized_value = ""

            fill_data[target_key] = normalized_value
            # 查找该单元格所属表格的默认字体
            cell_table_idx = placeholder_info.get(target_key, {}).get("table_index", 1) - 1
            def_font = table_default_fonts.get(cell_table_idx, (None, None))
            _replace_cell_text_preserve_format(cell, normalized_value, def_font[0], def_font[1])

            if not normalized_value:
                register_missing(target_key)

    # AI 未返回或未命中的占位符统一视为缺失，避免保留 {n} 标签
    for target_key, cell in placeholder_map.items():
        if target_key in resolved_placeholders:
            continue
        cell_table_idx = placeholder_info.get(target_key, {}).get("table_index", 1) - 1
        def_font = table_default_fonts.get(cell_table_idx, (None, None))
        _replace_cell_text_preserve_format(cell, "", def_font[0], def_font[1])
        fill_data[target_key] = ""
        register_missing(target_key)

    inferred_fields_map = {}

    # 5. 如果有无表头的缺失字段，用 AI 推断字段名称
    if placeholder_needs_ai_inference:
        placeholder_keys = list(placeholder_needs_ai_inference.keys())
        inferred_fields = infer_field_names_with_ai(
            placeholder_needs_ai_inference,
            "\n".join(markdown_lines),
            normalized_user_info_text
        )
        inferred_fields_map = {
            key: inferred_fields[idx]
            for idx, key in enumerate(placeholder_keys)
            if idx < len(inferred_fields)
        }
        for field in inferred_fields:
            candidate = str(field).strip()
            if candidate and candidate not in missing_fields_seen:
                missing_fields.append(candidate)
                missing_fields_seen.add(candidate)

    low_confidence_fields = []
    low_confidence_seen = set()
    for target_key in low_confidence_keys:
        display_name = get_display_field_name(target_key, inferred_fields_map)
        if display_name and display_name not in low_confidence_seen:
            low_confidence_fields.append(display_name)
            low_confidence_seen.add(display_name)

    print(f"📋 缺失字段列表: {missing_fields}")
    if low_confidence_fields:
        print(f"📉 低置信度字段列表: {low_confidence_fields}")

    out = io.BytesIO()
    doc.save(out)
    output_bytes = out.getvalue()

    if return_fill_data:
        if return_metadata:
            return output_bytes, fill_data, missing_fields, {
                "low_confidence_fields": low_confidence_fields
            }
        return output_bytes, fill_data, missing_fields
    return output_bytes


def infer_field_names_with_ai(placeholder_info_map, markdown_context, user_info_text):
    """
    使用 AI 推断缺失字段的名称（当表头为空时）

    Args:
        placeholder_info_map: 占位符信息字典 {占位符: {table_index, row_index, col_index}}
        markdown_context: Markdown 表格上下文
        user_info_text: 用户已填写的信息

    Returns:
        list: 推断出的字段名称列表
    """
    if not placeholder_info_map:
        return []

    url = "https://api-inference.modelscope.cn/v1/chat/completions"
    api_key = os.environ.get("MODELSCOPE_API_KEY", "")
    model_endpoint = os.environ.get("MODEL_ENDPOINT") or "deepseek-ai/DeepSeek-V3.2"

    # 构建占位符信息
    placeholders_text = "\n".join([
        f"- {k}: 表格{v['table_index']}第{v['row_index']}行第{v['col_index']}列"
        for k, v in placeholder_info_map.items()
    ])

    prompt = f"""你是一个表单字段分析助手。表格中有一些空单元格没有表头，需要你根据上下文推断这些单元格应该填写什么类型的字段。

**任务：**
分析表格结构和用户信息，推断每个空单元格应该填写什么类型的字段名称（如"身高"、"体重"、"毕业院校"等）。

**表格上下文：**
{markdown_context}

**需要推断的占位符位置：**
{placeholders_text}

**用户已填写的信息：**
{user_info_text}

**返回格式：**
请以纯 JSON 数组格式返回字段名称，顺序与占位符顺序一致，示例：
["身高(cm)", "体重(kg)", "毕业院校"]

只返回字段名称，不要其他解释。如果没有足够信息推断，可以使用通用描述如"字段"、"信息"等。"""

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    data = {
        "model": model_endpoint,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "top_p": 0.7,
        "max_tokens": 500
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        if response.status_code != 200:
            # 如果 AI 调用失败，返回占位符作为默认
            return list(placeholder_info_map.keys())

        res_json = response.json()
        content = res_json['choices'][0]['message']['content']

        # 清理 Markdown 代码块标记
        content = content.replace("```json", "").replace("```", "").strip()

        # 解析 JSON 数组
        try:
            inferred_fields = json.loads(content)
            if isinstance(inferred_fields, list):
                # 确保返回数量与占位符数量一致
                if len(inferred_fields) == len(placeholder_info_map):
                    return inferred_fields
                else:
                    # 数量不匹配时，补充或截断
                    placeholders = list(placeholder_info_map.keys())
                    if len(inferred_fields) < len(placeholders):
                        return inferred_fields + placeholders[len(inferred_fields):]
                    else:
                        return inferred_fields[:len(placeholders)]
            return list(placeholder_info_map.keys())
        except json.JSONDecodeError:
            # 尝试提取数组格式
            matches = re.findall(r'"([^"]+)"', content)
            if matches:
                return matches
            return list(placeholder_info_map.keys())
    except Exception as e:
        print(f"❌ AI 推断字段名称失败: {e}")
        return list(placeholder_info_map.keys())