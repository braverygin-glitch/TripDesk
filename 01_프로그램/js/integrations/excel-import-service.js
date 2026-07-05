window.ExcelImportService = {
  async importFile(file) {
    const rows = await this.readRows(file);
    if (!rows.length) throw new Error("가져올 행이 없습니다.");
    return this.buildTripFromRows(rows, file.name);
  },

  async readRows(file) {
    const name = file.name.toLowerCase();

    if (name.endsWith(".csv")) {
      const text = await file.text();
      return this.parseCsv(text);
    }

    if (name.endsWith(".xlsx")) {
      return this.parseXlsx(file);
    }

    if (name.endsWith(".xls")) {
      throw new Error("구형 .xls는 지원하지 않습니다. 엑셀에서 .xlsx로 저장한 뒤 가져오세요.");
    }

    throw new Error(".xlsx 또는 .csv 파일만 가져올 수 있습니다.");
  },

  buildTripFromRows(rows, filename) {
    const normalizedRows = rows.map(row => this.normalizeRow(row)).filter(row => row.title);
    if (!normalizedRows.length) throw new Error("제목이 있는 일정이 없습니다.");

    const dates = normalizedRows.map(row => row.date).filter(Boolean).sort();
    const cities = [...new Set(normalizedRows.map(row => row.city).filter(Boolean))];
    const tripName = this.guessTripName(filename);

    const trip = {
      id: Utils.id("trip"),
      name: tripName,
      startDate: dates[0] || Utils.today(),
      endDate: dates[dates.length - 1] || dates[0] || Utils.today(),
      travelers: "",
      memo: `${filename}에서 가져온 여행입니다.`,
      cities,
      schedule: [],
      bookings: [],
      expenses: [],
      checklist: [],
      notes: "",
      lastImport: {
        filename,
        importedAt: new Date().toISOString()
      },
      schemaVersion: "1.0"
    };

    normalizedRows.forEach(row => {
      const confirmed = this.isConfirmed(row.confirmed);
      const tags = Utils.splitTags(row.tags);
      if (confirmed && !tags.includes("확정")) tags.push("확정");

      const scheduleItem = {
        id: Utils.id("s"),
        date: row.date || trip.startDate,
        city: row.city,
        time: row.time,
        title: row.title,
        type: row.type || "일정",
        tags,
        confirmed: row.confirmed,
        pinned: confirmed,
        done: false,
        memo: row.memo,
        reservationNo: row.reservationNo,
        address: row.address
      };

      if (!this.hasDuplicateSchedule(trip, scheduleItem)) {
        trip.schedule.push(scheduleItem);
      }

      if (this.shouldCreateBooking(row)) {
        const booking = {
          id: Utils.id("b"),
          category: row.type || "예약",
          title: row.title,
          date: row.date || trip.startDate,
          memo: [row.memo, row.reservationNo ? `예약번호: ${row.reservationNo}` : "", row.address ? `주소: ${row.address}` : ""]
            .filter(Boolean)
            .join("\n"),
          reservationNo: row.reservationNo,
          address: row.address,
          pinned: confirmed
        };

        if (!this.hasDuplicateBooking(trip, booking)) {
          trip.bookings.push(booking);
        }
      }
    });

    trip.schedule.sort(Utils.sortSchedule);
    Utils.normalizeTrip(trip);
    return trip;
  },

  normalizeRow(raw) {
    const clean = {};
    Object.keys(raw).forEach(key => {
      clean[String(key).trim()] = raw[key];
    });

    const get = (...keys) => {
      for (const key of keys) {
        if (clean[key] !== undefined && clean[key] !== null) {
          return String(clean[key]).trim();
        }
      }
      return "";
    };

    return {
      date: Utils.normalizeDate(get("날짜", "date", "Date")),
      city: get("도시", "city", "City"),
      time: Utils.normalizeTime(get("시간", "time", "Time")),
      title: get("제목", "title", "Title", "일정"),
      type: get("분류", "type", "Type", "카테고리"),
      tags: get("태그", "tags", "Tags"),
      confirmed: get("확정여부", "확정", "confirmed", "Confirmed"),
      memo: get("메모", "memo", "Memo"),
      reservationNo: get("예약번호", "reservationNo", "ReservationNo", "예약 번호"),
      address: get("주소", "address", "Address")
    };
  },

  isConfirmed(value) {
    const text = String(value || "").trim().toLowerCase();
    return text === "확정" || text === "yes" || text === "y" || text === "1" || text === "confirmed";
  },

  shouldCreateBooking(row) {
    const type = String(row.type || "");
    return Boolean(row.reservationNo || row.address || /숙소|항공|입장|기차|버스|예약|공연/.test(type));
  },

  hasDuplicateSchedule(trip, item) {
    return trip.schedule.some(existing =>
      existing.date === item.date &&
      existing.time === item.time &&
      existing.title === item.title
    );
  },

  hasDuplicateBooking(trip, item) {
    return trip.bookings.some(existing =>
      existing.date === item.date &&
      existing.title === item.title
    );
  },

  guessTripName(filename) {
    let name = String(filename || "새 여행")
      .replace(/\.(xlsx|csv)$/i, "")
      .replace(/_?확정내역$/i, "")
      .replace(/_/g, " ")
      .trim();

    const match = name.match(/^(\d{4})(\d{2})\s+(.+)$/);
    if (match) {
      name = `${match[1]}년 ${Number(match[2])}월 ${match[3]}`;
    }

    return name || "새 여행";
  },

  parseCsv(text) {
    const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length < 2) return [];

    const headers = this.splitCsvLine(lines[0]).map(header => header.trim());
    return lines.slice(1).map(line => {
      const values = this.splitCsvLine(line);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ?? "";
      });
      return row;
    });
  },

  splitCsvLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current);
    return result.map(value => value.trim());
  },

  async parseXlsx(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const entries = await this.unzipXlsx(bytes);

    const sheetName = Object.keys(entries).find(name => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name));
    if (!sheetName) throw new Error("엑셀 파일에서 첫 번째 시트를 찾지 못했습니다.");

    const sharedStringsXml = entries["xl/sharedStrings.xml"] ? this.bytesToText(entries["xl/sharedStrings.xml"]) : "";
    const sheetXml = this.bytesToText(entries[sheetName]);

    const sharedStrings = this.parseSharedStrings(sharedStringsXml);
    return this.parseWorksheet(sheetXml, sharedStrings);
  },

  async unzipXlsx(bytes) {
    const entries = {};
    const eocdOffset = this.findEndOfCentralDirectory(bytes);
    if (eocdOffset < 0) throw new Error("올바른 XLSX 파일이 아닙니다.");

    const totalEntries = this.readUInt16(bytes, eocdOffset + 10);
    let centralOffset = this.readUInt32(bytes, eocdOffset + 16);

    for (let i = 0; i < totalEntries; i++) {
      if (this.readUInt32(bytes, centralOffset) !== 0x02014b50) break;

      const compressionMethod = this.readUInt16(bytes, centralOffset + 10);
      const compressedSize = this.readUInt32(bytes, centralOffset + 20);
      const fileNameLength = this.readUInt16(bytes, centralOffset + 28);
      const extraLength = this.readUInt16(bytes, centralOffset + 30);
      const commentLength = this.readUInt16(bytes, centralOffset + 32);
      const localHeaderOffset = this.readUInt32(bytes, centralOffset + 42);

      const fileNameBytes = bytes.slice(centralOffset + 46, centralOffset + 46 + fileNameLength);
      const fileName = this.bytesToText(fileNameBytes);

      const localNameLength = this.readUInt16(bytes, localHeaderOffset + 26);
      const localExtraLength = this.readUInt16(bytes, localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.slice(dataStart, dataStart + compressedSize);

      if (!fileName.endsWith("/")) {
        if (compressionMethod === 0) {
          entries[fileName] = compressed;
        } else if (compressionMethod === 8) {
          entries[fileName] = await this.inflateRaw(compressed);
        }
      }

      centralOffset += 46 + fileNameLength + extraLength + commentLength;
    }

    return entries;
  },

  findEndOfCentralDirectory(bytes) {
    const min = Math.max(0, bytes.length - 66000);
    for (let i = bytes.length - 22; i >= min; i--) {
      if (this.readUInt32(bytes, i) === 0x06054b50) return i;
    }
    return -1;
  },

  async inflateRaw(bytes) {
    if (!("DecompressionStream" in window)) {
      throw new Error("현재 브라우저가 XLSX 압축 해제를 지원하지 않습니다. Chrome 또는 Edge에서 실행하거나 CSV로 저장해 가져오세요.");
    }

    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }
  },

  parseSharedStrings(xmlText) {
    if (!xmlText) return [];
    const doc = this.parseXml(xmlText);
    return Array.from(doc.getElementsByTagNameNS("*", "si")).map(si => si.textContent || "");
  },

  parseWorksheet(xmlText, sharedStrings) {
    const doc = this.parseXml(xmlText);
    const rowNodes = Array.from(doc.getElementsByTagNameNS("*", "row"));
    const matrix = [];

    rowNodes.forEach(rowNode => {
      const row = [];
      const cells = Array.from(rowNode.getElementsByTagNameNS("*", "c"));

      cells.forEach(cell => {
        const ref = cell.getAttribute("r") || "";
        const colIndex = this.columnIndexFromCellRef(ref);
        const type = cell.getAttribute("t") || "";
        const valueNode = cell.getElementsByTagNameNS("*", "v")[0];
        const inlineNode = cell.getElementsByTagNameNS("*", "t")[0];

        let value = "";
        if (type === "s" && valueNode) {
          value = sharedStrings[Number(valueNode.textContent || 0)] || "";
        } else if (type === "inlineStr" && inlineNode) {
          value = inlineNode.textContent || "";
        } else if (valueNode) {
          value = valueNode.textContent || "";
        }

        row[colIndex] = value;
      });

      matrix.push(row);
    });

    if (matrix.length < 2) return [];

    const headers = matrix[0].map(value => String(value || "").trim());
    return matrix.slice(1)
      .filter(row => row.some(value => String(value || "").trim() !== ""))
      .map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          if (header) obj[header] = row[index] ?? "";
        });
        return obj;
      });
  },

  parseXml(text) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) {
      throw new Error("엑셀 XML을 읽는 중 오류가 발생했습니다.");
    }
    return doc;
  },

  columnIndexFromCellRef(ref) {
    const letters = String(ref).match(/[A-Z]+/i)?.[0] || "A";
    let index = 0;
    for (const ch of letters.toUpperCase()) {
      index = index * 26 + (ch.charCodeAt(0) - 64);
    }
    return index - 1;
  },

  readUInt16(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8);
  },

  readUInt32(bytes, offset) {
    return (
      bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)
    ) >>> 0;
  },

  bytesToText(bytes) {
    return new TextDecoder("utf-8").decode(bytes);
  }
};
