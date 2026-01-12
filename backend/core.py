import io
import json
import requests
import ast
import os
import re
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm

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

    url = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
    api_key = os.environ.get("ARK_API_KEY") or "5410d463-1115-4320-9279-a5441ce30694"
    model_endpoint = os.environ.get("MODEL_ENDPOINT") or "doubao-seed-1-6-251015"

    prompt = f"""你是一个表单字段分析助手。请分析以下模板表格和个人信息，找出表格中可能需要但个人信息中缺失的字段。

**任务：**
1. 分析表格的表头和占位符，推断每个占位符需要填写什么类型的信息
2. 对比个人信息，判断哪些重要字段可能缺失
3. 返回缺失的关键字段列表（最多返回 5 个最重要的）

**模板表格的表头：**
{headers_text}

**模板需要的字段（占位符对应关系）：**
{placeholders_text}

**用户已填写的信息：**
{user_info_text}

**返回格式：**
请以纯 JSON 数组格式返回，示例：
["身高(cm)", "民族", "学历"]

只返回字段名称，用中文顿号（、）分隔。最多返回 5 个最重要的缺失字段。"""

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
            return []

        res_json = response.json()
        content = res_json['choices'][0]['message']['content']

        # 清理 Markdown 代码块标记
        content = content.replace("```json", "").replace("```", "").strip()

        # 解析 JSON 数组
        try:
            missing_fields = json.loads(content)
            if isinstance(missing_fields, list):
                return missing_fields[:5]  # 最多返回 5 个
            return []
        except json.JSONDecodeError:
            # 尝试提取数组格式
            import re
            matches = re.findall(r'"([^"]+)"', content)
            if matches:
                return matches[:5]
            return []
    except Exception as e:
        print(f"❌ 分析缺失字段失败: {e}")
        return []


def get_doubao_response(user_info, markdown_context):
    """
    参考 smart.py 的提示词思路，使用 Markdown 表格作为上下文
    """
    if isinstance(user_info, bytes):
        user_info = user_info.decode('utf-8')

    url = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
    api_key = os.environ.get("ARK_API_KEY") or "5410d463-1115-4320-9279-a5441ce30694"
    model_endpoint = os.environ.get("MODEL_ENDPOINT") or "doubao-seed-1-6-251015"

    # 参考 smart.py 的提示词构建方式
    prompt = f"""你是一个专业的占位符替换助手。请分析以下 Markdown 表格和个人信息，推断每个占位符应该替换成什么内容。

**任务要求：**
1. 仔细分析表格中的占位符格式（如 {{1}}、{{2}} 等）。
2. 根据【个人信息】推理每个占位符应该填入的内容，允许合理推理和推断。
3. 如果无法确定某个占位符的内容，返回空字符串。
4. 返回格式必须是纯 JSON，格式为：{{"{{1}}": "内容", "{{2}}": "内容"}}。
5. 文字过长请注意换行来让排版更美观。

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
        "temperature": 1, 
        "top_p": 0.7,
        "thinking": {"type": "disabled"}
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

        # 打印 fill_data 供 server_with_auth.py 记录
        print(f"📋 AI 生成的填充数据: {fill_data}")
        return fill_data
    except Exception as e:
        print(f"❌ Error during AI inference: {e}")
        return {}

def fill_form(docx_bytes, user_info_text, photo_bytes, return_fill_data=False):
    """
    填充表单

    Args:
        docx_bytes: Word文档字节数据
        user_info_text: 用户信息文本
        photo_bytes: 照片字节数据
        return_fill_data: 是否返回填充数据（用于减少重复推理）

    Returns:
        如果 return_fill_data=True，返回 (output_bytes, fill_data, missing_fields)
        其中 missing_fields 是缺失字段的表头/位置信息列表
        否则返回 output_bytes
    """
    doc = Document(io.BytesIO(docx_bytes))

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
    counter = 1
    markdown_lines = []

    for t_idx, table in enumerate(doc.tables):
        markdown_lines.append(f"\n### 表格 {t_idx + 1}\n")

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
                    cell.text = tag
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
            return output_bytes, {}
        return output_bytes

    # 3. 调用 AI 进行推理
    fill_data = get_doubao_response(user_info_text, "\n".join(markdown_lines))

    # 4. 收集未填充的字段信息
    missing_fields = []  # 存储未填充的字段（值为空或不存在）
    placeholder_needs_ai_inference = {}  # 存储需要 AI 推断字段名称的占位符

    # 4. 填充数据
    if fill_data:
        for key, value in fill_data.items():
            # 兼容 AI 返回 "1" 而不是 "{1}" 的情况
            target_key = key if key.startswith("{") else f"{{{key}}}"
            if target_key in placeholder_map:
                cell = placeholder_map[target_key]
                cell.text = str(value)
                for p in cell.paragraphs:
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT

                # 检查是否为空值
                if not str(value).strip():
                    # 使用 target_key 进行 lookup，因为 placeholder_info 的 key 格式是 {1}
                    header_info = placeholder_info.get(target_key, {})
                    header = header_info.get('header', '')
                    if header:
                        # 有表头，直接使用表头作为字段名
                        missing_fields.append(header)
                    else:
                        # 没有表头，从 placeholder_info 获取位置信息
                        if target_key in placeholder_info:
                            pos_info = placeholder_info[target_key]
                            placeholder_needs_ai_inference[target_key] = {
                                "table_index": pos_info.get("table_index", 0),
                                "row_index": pos_info.get("row_index", 0),
                                "col_index": pos_info.get("col_index", 0)
                            }
                    print(f"⚠️ 识别到缺失字段: {header if header else target_key} (占位符: {target_key})")

    # 5. 如果有无表头的缺失字段，用 AI 推断字段名称
    if placeholder_needs_ai_inference:
        inferred_fields = infer_field_names_with_ai(
            placeholder_needs_ai_inference,
            "\n".join(markdown_lines),
            user_info_text
        )
        missing_fields.extend(inferred_fields)

    print(f"📋 缺失字段列表: {missing_fields}")

    out = io.BytesIO()
    doc.save(out)
    output_bytes = out.getvalue()

    if return_fill_data:
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

    url = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
    api_key = os.environ.get("ARK_API_KEY") or "5410d463-1115-4320-9279-a5441ce30694"
    model_endpoint = os.environ.get("MODEL_ENDPOINT") or "doubao-seed-1-6-251015"

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