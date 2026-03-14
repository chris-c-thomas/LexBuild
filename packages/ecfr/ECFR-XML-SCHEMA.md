# eCFR Bulk XML Schema Reference

> **Source**: govinfo.gov bulk data — `https://www.govinfo.gov/bulkdata/ECFR/title-{N}/ECFR-title{N}.xml`
>
> **Format**: GPO/SGML-derived XML (no namespace declarations, no XSD schema)
>
> **NOT USLM**: This format is completely different from the USLM 1.0 schema used by the U.S. Code. Elements, attributes, and structure differ entirely.

---

## Document Root Structure

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<DLPSTEXTCLASS>
  <HEADER>
    <FILEDESC>
      <TITLESTMT><TITLE>Title 1: General Provisions</TITLE><AUTHOR TYPE="nameinv"></AUTHOR></TITLESTMT>
      <PUBLICATIONSTMT>
        <PUBLISHER></PUBLISHER>
        <PUBPLACE></PUBPLACE>
        <IDNO TYPE="title">1</IDNO>
        <DATE></DATE>
      </PUBLICATIONSTMT>
      <SERIESSTMT><TITLE></TITLE></SERIESSTMT>
    </FILEDESC>
    <PROFILEDESC><TEXTCLASS><KEYWORDS></KEYWORDS></TEXTCLASS></PROFILEDESC>
  </HEADER>
  <TEXT>
    <BODY>
      <ECFRBRWS>
        <AMDDATE>Dec. 29, 2022(fm)</AMDDATE>
        <DIV1 N="1" NODE="1:1" TYPE="TITLE">
          <!-- Title content -->
        </DIV1>
      </ECFRBRWS>
    </BODY>
  </TEXT>
</DLPSTEXTCLASS>
```

### Metadata Available

| Location | Data | Example |
|----------|------|---------|
| `HEADER/FILEDESC/TITLESTMT/TITLE` | Title name | `"Title 1: General Provisions"` |
| `HEADER/FILEDESC/PUBLICATIONSTMT/IDNO[@TYPE="title"]` | Title number | `"1"` |
| `ECFRBRWS/AMDDATE` | Amendment date | `"Dec. 29, 2022(fm)"` |
| `DIV1/@N` | Title number | `"1"` |
| `DIV1/@NODE` | Node ID | `"1:1"` |
| `DIV1/HEAD` | Title heading | `"Title 1—General Provisions--Volume 1"` |

**Note**: No Dublin Core metadata, no release point, no positive law flag, no `dcterms:created`. Metadata is minimal compared to USLM.

---

## DIV Hierarchy

The eCFR uses numbered DIV elements where the `TYPE` attribute determines semantic meaning. **DIV2 is skipped** — the hierarchy goes DIV1 → DIV3 → DIV4 → DIV5 → DIV6/DIV7 → DIV8 → DIV9.

| Element | TYPE | CFR Level | LexBuild LevelType | N format | Notes |
|---------|------|-----------|--------------------|---------|----|
| `DIV1` | `TITLE` | Title | `title` | Numeric (`1`, `17`) | Root |
| ~~`DIV2`~~ | ~~`SUBTITLE`~~ | ~~Subtitle~~ | ~~`subtitle`~~ | — | **Not observed** in Titles 1 or 17 |
| `DIV3` | `CHAPTER` | Chapter | `chapter` | Roman (`I`, `II`) | Major grouping |
| `DIV4` | `SUBCHAP` | Subchapter | `subchapter` | Letter (`A`, `B`) | |
| `DIV5` | `PART` | Part | `part` | Numeric (`1`, `240`) | Primary regulatory unit |
| `DIV6` | `SUBPART` | Subpart | `subpart` | Letter (`A`, `B`) | |
| `DIV7` | `SUBJGRP` | Subject Group | `subpart` | Numeric (`1`–`6`) | Organizational grouping, not a legal subdivision |
| `DIV8` | `SECTION` | Section | `section` | `§ N.N` (`§ 1.1`, `§ 240.10b-5`) | Atomic regulatory unit |
| `DIV9` | `APPENDIX` | Appendix | `appendix` | Text (`Appendix A`) | Part-level appendix |

### Key Attributes on DIV Elements

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `N` | Display number/label | `"§ 1.1"`, `"I"`, `"Appendix A"` |
| `NODE` | Hierarchical position ID | `"17:1.0.1.1.1.0.1.1"` |
| `TYPE` | Semantic level type | `"SECTION"`, `"PART"`, `"CHAPTER"` |

### NODE Attribute Format

The NODE attribute is a colon-and-dot-separated hierarchical position identifier:

```
NODE="17:1.0.1.1.1.0.1.1"
       ^  ^^^^^^^^^^^^^^^^^
       |  position within hierarchy
       title number
```

This is NOT a USLM-style identifier. The builder constructs CFR-style identifiers:
```
NODE="17:1.0.1.1.1.0.1.1" + N="§ 1.1" → identifier: "/us/cfr/t17/s1.1"
```

---

## Section Structure (DIV8 TYPE="SECTION")

```xml
<DIV8 N="§ 1.1" NODE="1:1.0.1.1.1.0.1.1" TYPE="SECTION">
  <HEAD>§ 1.1   Definitions.</HEAD>
  <P>As used in this chapter, unless the context requires otherwise—</P>
  <P><I>Administrative Committee</I> means the Administrative Committee...</P>
  <P><I>Document</I> includes any Presidential proclamation...</P>
  <CITA TYPE="N">[37 FR 23603, Nov. 4, 1972, as amended at 50 FR 12466, Mar. 28, 1985]</CITA>
</DIV8>
```

### Critical Difference from USLM

**Subsections are NOT nested elements.** In USLM, `<subsection>`, `<paragraph>`, `<clause>` are nested. In eCFR, subsections are denoted by paragraph numbering prefixes within flat `<P>` elements:

```xml
<!-- eCFR: flat P elements with numbering prefixes -->
<P>(a) First subsection text...</P>
<P>(b) Second subsection text...</P>
<P>(1) First paragraph under (b)...</P>
<P>(2) Second paragraph...</P>

<!-- USLM equivalent would be nested -->
<subsection><num>(a)</num><content><p>First subsection...</p></content></subsection>
```

---

## Content Elements

| Element | Purpose | Example |
|---------|---------|---------|
| `P` | Paragraph (primary content) | `<P>(a) Text...</P>` |
| `FP` | Flush paragraph (no indent) | `<FP>in connection with the purchase...</FP>` |
| `FP-1` | Indented flush paragraph (1 level) | `<FP-1>Date</FP-1>` |
| `FP-2` | Indented flush paragraph (2 levels) | `<FP-2><I>P</I><E T="54">Net</E> = ...</FP-2>` |
| `FP-DASH` | Dash-leader flush paragraph (form lines) | `<FP-DASH></FP-DASH>` |
| `FP1-2` | Alternative indented paragraph | Rare |
| `EXTRACT` | Extracted/quoted text block | `<EXTRACT><FP>(Certified copy)</FP></EXTRACT>` |
| `EXAMPLE` | Illustrative example block | `<EXAMPLE>...</EXAMPLE>` |

### Sub-Headings Within Sections

| Element | Purpose | Example |
|---------|---------|---------|
| `HD1` | Level-1 sub-heading | `<HD1>Risk Disclosure Statement</HD1>` |
| `HD2` | Level-2 sub-heading | `<HD2>Subtitle</HD2>` |
| `HD3` | Level-3 sub-heading | `<HD3>Sub-subtitle</HD3>` |

These appear inside DIV8 (sections) and DIV9 (appendices) for internal structure, typically in longer regulatory sections and appendices.

---

## Inline Formatting Elements

### E Element (Emphasis with Type Codes)

| T Value | Rendering | Usage |
|---------|-----------|-------|
| `"01"` | Bold | General emphasis |
| `"02"` | Italic | Definitions, terms |
| `"03"` | Bold italic | Strong emphasis |
| `"04"` | Italic (headings) | Chapter/part labels in TOC |
| `"05"` | Small caps | Exhibit labels, formal references |
| `"51"` | Subscript | Math notation |
| `"52"` | Subscript | Math notation |
| `"54"` | Subscript | Math subscripts (e.g., P<sub>Net</sub>) |
| `"7462"` | Italic | Special terms (et seq., De minimis) |

### Other Inline Elements

| Element | Purpose | LexBuild InlineType |
|---------|---------|---------------------|
| `I` | Italic | `italic` |
| `B` | Bold | `bold` |
| `SU` | Superscript (footnote markers) | `sup` |
| `FR` | Fraction | `text` (render as "N/D") |
| `XREF` | Cross-reference link | `ref` |
| `FTREF` | Footnote reference marker | `footnoteRef` |

### XREF Element

```xml
<XREF ID="20240328" REFID="6">Link to an amendment published at 89 FR 21912, Mar. 28, 2024.</XREF>
```

Attributes: `ID` (unique identifier), `REFID` (reference target number).

---

## Note/Annotation Elements

| Element | Purpose | Structure | LexBuild Mapping |
|---------|---------|-----------|-----------------|
| `AUTH` | Authority citation | `<AUTH><HED>Authority:</HED><PSPACE>text</PSPACE></AUTH>` | NoteNode (noteType: "authority") |
| `SOURCE` | Publication source | `<SOURCE><HED>Source:</HED><PSPACE>text</PSPACE></SOURCE>` | NoteNode (noteType: "regulatorySource") |
| `CITA` | Amendment history | `<CITA TYPE="N">[37 FR 23603, Nov. 4, 1972]</CITA>` | NoteNode (noteType: "citation") |
| `EDNOTE` | Editorial note | `<EDNOTE><HED>Editorial Note:</HED><PSPACE>text</PSPACE></EDNOTE>` | NoteNode (noteType: "editorial") |
| `EFFDNOT` | Effective date note | `<EFFDNOT><HED>Effective Date Note:</HED><PSPACE>text</PSPACE></EFFDNOT>` | NoteNode (noteType: "effectiveDate") |
| `APPRO` | OMB approval notice | `<APPRO TYPE="N">(Approved by OMB...)</APPRO>` | NoteNode (noteType: "approval") |
| `NOTE` | General note | `<NOTE><HED>Note:</HED><P>text</P></NOTE>` | NoteNode |
| `CROSSREF` | Cross-reference block | `<CROSSREF><HED>Cross Reference:</HED><P>text</P></CROSSREF>` | NoteNode (noteType: "crossReference") |
| `SECAUTH` | Section-level authority | `<SECAUTH TYPE="N">(Sec. 10; 48 Stat. 891; ...)</SECAUTH>` | NoteNode (noteType: "sectionAuthority") |
| `FTNT` | Footnote | `<FTNT><P><SU>1</SU> Text...</P></FTNT>` | NoteNode (footnote) |

### Note Subelement Structure

AUTH, SOURCE, EDNOTE, EFFDNOT share a common pattern:
```xml
<ELEMENT>
  <HED>Label:</HED>
  <PSPACE>Content text</PSPACE>
</ELEMENT>
```

CITA, APPRO, SECAUTH contain text directly:
```xml
<CITA TYPE="N">[37 FR 23603, Nov. 4, 1972]</CITA>
```

NOTE, CROSSREF contain P elements:
```xml
<NOTE><HED>Note:</HED><P>Text paragraph</P></NOTE>
```

### Note Placement

- `AUTH` and `SOURCE` appear at the PART level (DIV5), before sections
- `SECAUTH` appears within sections, after content
- `CITA` appears within sections, typically last (amendment history)
- `EDNOTE` appears after CITA or at part level
- `EFFDNOT` appears at section end, after CITA
- `APPRO` appears within sections, before CITA
- `CROSSREF` appears within sections or at part level
- `NOTE` appears within appendices and sections
- `FTNT` appears within sections (footnotes)

---

## Table Elements

eCFR uses **HTML-style tables**, NOT GPO-formatted tables:

```xml
<DIV width="100%" >
  <DIV class="gpotbl_div">
    <TABLE border="1" cellpadding="1" cellspacing="1" class="gpotbl_table" frame="void" width="100%">
      <TR>
        <TH class="gpotbl_colhed" scope="col">Column 1</TH>
        <TH class="gpotbl_colhed" scope="col">Column 2</TH>
      </TR>
      <TR>
        <TD align="left" class="gpotbl_cell" scope="row">Data 1</TD>
        <TD align="left" class="gpotbl_cell">Data 2</TD>
      </TR>
    </TABLE>
  </DIV>
</DIV>
```

**Elements**: `TABLE`, `TR`, `TH`, `TD` (standard HTML table elements, NOT in an XHTML namespace).

**Wrapping**: Tables are wrapped in `<DIV class="gpotbl_div">` inside another `<DIV width="100%">`. These wrapper DIVs are lowercase in some places.

**Note**: The refactor plan referenced `GPOTABLE`/`ROW`/`ENT`/`CHED` elements — these do NOT appear in the eCFR bulk XML. That format may be used in other GPO products but not here.

---

## TOC and Navigation Elements (Ignored)

| Element | Purpose |
|---------|---------|
| `CFRTOC` | Table of contents block |
| `PTHD` | Part heading in TOC |
| `CHAPTI` | Chapter item in TOC |
| `SUBJECT` | Subject text in TOC |
| `PG` | Page number |
| `RESERVED` | Reserved section/chapter placeholder |
| `STARS` | Section separator |

---

## Special Elements

| Element | Purpose | Example |
|---------|---------|---------|
| `MATH` | Mathematical formula | Rare |
| `RESERVED` | `[Reserved]` placeholder | `<RESERVED><E T="04">chapter v</E> [Reserved]</RESERVED>` |
| `STARS` | Visual separator | `<STARS/>` |
| `img` | Embedded image reference | `<img src="/graphics/er18no13.003.gif"/>` |

---

## Complete Element Inventory

### Title 1 Elements (55 unique)

```
AMDDATE, AUTH, AUTHOR, B, BODY, CFRTOC, CHAPTI, CITA, DATE, DIV,
DIV1, DIV3, DIV4, DIV5, DIV6, DIV7, DIV8, DLPSTEXTCLASS, E, ECFRBRWS,
EXAMPLE, EXTRACT, FILEDESC, FP, FP-1, FP-2, FP-DASH, FR, FRP, FTNT,
FTREF, HEAD, HEADER, HED, I, IDNO, KEYWORDS, P, PG, PROFILEDESC,
PSPACE, PTHD, PUBLICATIONSTMT, PUBLISHER, PUBPLACE, RESERVED,
SERIESSTMT, SOURCE, SU, SUBJECT, TABLE, TD, TEXT, TEXTCLASS, TH,
TITLE, TITLESTMT, TR
```

### Title 17 Additional Elements (12 more)

```
APPRO, CROSSREF, DIV9, EDNOTE, EFFDNOT, FP1-2, HD1, HD2, HD3,
MATH, NOTE, SECAUTH, STARS, XREF
```

---

## Comparison: eCFR vs USLM 1.0

| Aspect | USLM 1.0 (USC) | GPO/SGML (eCFR) |
|--------|-----------------|------------------|
| Namespace | `http://xml.house.gov/schemas/uslm/1.0` | None |
| Level elements | Semantic names (`<title>`, `<chapter>`, `<section>`) | Numbered (`<DIV1>`–`<DIV9>`) + TYPE attr |
| Headings | `<heading>` child element | `<HEAD>` child element |
| Numbers | `<num value="1">§ 1.</num>` | `N` attribute on DIV |
| Content text | `<content><p>text</p></content>` | `<P>text</P>` directly in DIV |
| Subsections | Nested elements (`<subsection>`, `<paragraph>`) | Flat `<P>` with numbering prefixes |
| Authority | Not present | `<AUTH><HED>...<PSPACE>...</AUTH>` |
| Source credit | `<sourceCredit>text</sourceCredit>` | `<SOURCE><HED>...<PSPACE>...</SOURCE>` |
| Identifiers | `identifier="/us/usc/t1/s1"` | `NODE="1:1.0.1.1.1.0.1.1"` |
| Formatting | `<b>`, `<i>`, `<ref>` | `<E T="xx">`, `<I>`, `<XREF>` |
| Tables | XHTML `<table>` in XHTML namespace | HTML `<TABLE>` (no namespace) |
| Metadata | Rich Dublin Core in `<meta>` | Minimal in `<HEADER>` |
| Cross-refs | `<ref href="/us/usc/...">` inline | `<XREF>` with ID/REFID attrs |
| Footnotes | `<ref class="footnoteRef">` + `<note type="footnote">` | `<FTREF>` + `<FTNT>` |
