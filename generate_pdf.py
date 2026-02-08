#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ブロックチェーンエクスプローラー PDF出力スクリプト

使用方法:
    python3 generate_pdf.py <json_file_path>
"""

import json
import sys
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, 
    Spacer, PageBreak, Image
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.graphics.shapes import Drawing, Circle, Line
from reportlab.graphics import renderPDF

# フォント設定 (Helvetica - 万国共通で表示可能)
FONT_NAME = 'Helvetica'
FONT_NAME_BOLD = 'Helvetica-Bold'
print("Using Helvetica font for universal compatibility")

# チェーンカラー定義
CHAIN_COLORS = {
    'ethereum': '#00ffff',
    'bitcoin': '#ff9500',
    'polygon': '#8247e5',
    'bsc': '#f0b90b',
    'arbitrum': '#28a0f0',
    'optimism': '#ff0420',
    'usdt': '#26a17b',
    'usdc': '#2775ca',
    'other': '#ff00ff'
}

def hex_to_rgb(hex_color):
    """HEXカラーをRGBタプルに変換"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def create_title_page(elements, data):
    """タイトルページを作成"""
    styles = getSampleStyleSheet()
    
    # カスタムスタイル
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontName=FONT_NAME,
        fontSize=28,
        textColor=colors.HexColor('#00ffff'),
        alignment=TA_CENTER,
        spaceAfter=30
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontName=FONT_NAME,
        fontSize=14,
        textColor=colors.HexColor('#ffffff'),
        alignment=TA_CENTER,
        spaceAfter=40
    )
    
    # タイトル
    elements.append(Spacer(1, 1 * inch))
    elements.append(Paragraph("Blockchain Transaction Report", title_style))
    elements.append(Paragraph("Burokuchen Toranzakushon Repoto", subtitle_style))
    
    # メタデータテーブル
    metadata = data.get('metadata', {})
    meta_data = [
        ['Export Date', datetime.fromisoformat(metadata.get('exportDate', datetime.now().isoformat())).strftime('%Y-%m-%d %H:%M:%S')],
        ['API Used', metadata.get('apiUsed', 'Unknown')],
        ['Total Nodes', str(metadata.get('totalNodes', 0))],
        ['Total Edges', str(metadata.get('totalEdges', 0))]
    ]
    
    meta_table = Table(meta_data, colWidths=[2*inch, 4*inch])
    meta_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), FONT_NAME, 10),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#1a1a2e')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#00ffff')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#00ffff')),
        ('ROWBACKGROUNDS', (1, 0), (1, -1), [colors.HexColor('#0a0a0f'), colors.HexColor('#16213e')]),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    elements.append(Spacer(1, 0.5 * inch))
    elements.append(meta_table)
    elements.append(PageBreak())

def create_nodes_summary(elements, nodes):
    """ノードサマリーページを作成"""
    styles = getSampleStyleSheet()
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading1'],
        fontName=FONT_NAME,
        fontSize=18,
        textColor=colors.HexColor('#00ffff'),
        spaceAfter=20
    )
    
    elements.append(Paragraph("Address List", heading_style))
    elements.append(Spacer(1, 0.2 * inch))
    
    # チェーン別にグループ化
    chain_groups = {}
    for node in nodes:
        chain = node.get('chain', 'unknown')
        if chain not in chain_groups:
            chain_groups[chain] = []
        chain_groups[chain].append(node)
    
    # チェーンごとにテーブル作成
    for chain, chain_nodes in chain_groups.items():
        # チェーンヘッダー
        chain_header_style = ParagraphStyle(
            'ChainHeader',
            parent=styles['Heading2'],
            fontName=FONT_NAME,
            fontSize=14,
            textColor=colors.HexColor(CHAIN_COLORS.get(chain, '#ffffff')),
            spaceAfter=10
        )
        elements.append(Paragraph(f"{chain.upper()} Chain ({len(chain_nodes)} addresses)", chain_header_style))
        
        # ノードデータテーブル
        table_data = [['Address', 'Token', 'Balance', 'TX', 'Level']]
        
        for node in chain_nodes[:20]:  # 最大20件まで表示
            table_data.append([
                node.get('address', '')[:20] + '...' if len(node.get('address', '')) > 20 else node.get('address', ''),
                node.get('tokenType', '').upper(),
                f"{node.get('balance', 0)}",
                str(node.get('txCount', 0)),
                str(node.get('level', 0))
            ])
        
        if len(chain_nodes) > 20:
            table_data.append(['...', f'{len(chain_nodes) - 20} more', '', '', ''])
        
        node_table = Table(table_data, colWidths=[2.5*inch, 0.8*inch, 1*inch, 0.8*inch, 0.6*inch])
        node_table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), FONT_NAME, 8),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#00ffff')),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (2, 0), (4, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#00ffff')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#0a0a0f'), colors.HexColor('#16213e')]),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(node_table)
        elements.append(Spacer(1, 0.3 * inch))
    
    elements.append(PageBreak())

def create_edges_summary(elements, edges, nodes):
    """エッジ（トランザクション）サマリーページを作成"""
    styles = getSampleStyleSheet()
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading1'],
        fontName=FONT_NAME,
        fontSize=18,
        textColor=colors.HexColor('#00ffff'),
        spaceAfter=20
    )
    
    elements.append(Paragraph("Transaction List", heading_style))
    elements.append(Spacer(1, 0.2 * inch))
    
    # エッジデータテーブル
    table_data = [['From', 'To']]
    
    for edge in edges[:30]:  # 最大30件まで表示
        from_addr = edge.get('from', '')
        to_addr = edge.get('to', '')
        
        table_data.append([
            from_addr[:25] + '...' if len(from_addr) > 25 else from_addr,
            to_addr[:25] + '...' if len(to_addr) > 25 else to_addr
        ])
    
    if len(edges) > 30:
        table_data.append([f'... {len(edges) - 30} more transactions', ''])
    
    edge_table = Table(table_data, colWidths=[3*inch, 3*inch])
    edge_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), FONT_NAME, 8),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#00ffff')),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#00ffff')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#0a0a0f'), colors.HexColor('#16213e')]),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    elements.append(edge_table)

def generate_pdf(json_file_path, output_pdf_path):
    """JSONファイルからPDFを生成"""
    
    # JSONデータを読み込み
    with open(json_file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    nodes = data.get('nodes', [])
    edges = data.get('edges', [])
    
    # PDF作成
    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=A4,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch,
        leftMargin=0.5*inch,
        rightMargin=0.5*inch
    )
    
    elements = []
    
    # 各ページを作成
    create_title_page(elements, data)
    create_nodes_summary(elements, nodes)
    create_edges_summary(elements, edges, nodes)
    
    # PDFをビルド
    doc.build(elements)
    print(f"PDF generated successfully: {output_pdf_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 generate_pdf.py <json_file_path> [output_pdf_path]")
        sys.exit(1)
    
    json_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "blockchain_report.pdf"
    
    try:
        generate_pdf(json_file, output_file)
    except Exception as e:
        print(f"Error generating PDF: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
