// client/src/pages/cases/LeadFormCase.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../services/api";
import "../../styles/leadformcases.css";

export default function LeadFormCase() {
  const { id } = useParams();
  const navigate = useNavigate();

  // 🔹 Detect public mode
  const isPublic =
    typeof window !== "undefined" &&
    window.location.pathname.includes("public-form");

  const [form, setForm] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCoApplicant, setShowCoApplicant] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successProgress, setSuccessProgress] = useState(0);
  const [documentSections, setDocumentSections] = useState([]);
  const [filesToDelete, setFilesToDelete] = useState([]);

  /* -------------------------------------------------------------
     ✅ Success Animation
  ------------------------------------------------------------- */
  const showEnhancedSuccess = () => {
    setShowSuccessPopup(true);
    setSuccessProgress(0);
    const interval = setInterval(() => {
      setSuccessProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            if (!isPublic) {
              setShowSuccessPopup(false);
              navigate(`/cases/${id}/view`);
            } else {
              setShowSuccessPopup(false);
            }
          }, 1000);
          return 100;
        }
        return prev + 20;
      });
    }, 100);
  };

  /* -------------------------------------------------------------
     ✅ Load Case Data (fixed mapping)
  ------------------------------------------------------------- */
  useEffect(() => {
    const url = isPublic ? `/cases/${id}/public` : `/cases/${id}`;
    API.get(url)
      .then(({ data }) => {
        console.log("📦 Case loaded:", data);

        // ✅ Normalize possible data shapes
        const caseData = data.case || data || {};

        setForm({
          ...caseData,
          customerName:
            caseData.customerName || caseData.name || caseData.applicantName || "",
          mobile: caseData.mobile || caseData.primaryMobile || "",
          email: caseData.email || caseData.primaryEmail || "",
          leadType: caseData.leadType || "",
          subType: caseData.subType || "",
          bank: caseData.bank || "",
          branch: caseData.branch || "",
          channelPartner: caseData.channelPartner || "",
          assignedTo: caseData.assignedTo || "",
        });

        if (caseData.applicant2Name) setShowCoApplicant(true);

        // ✅ Default KYC structure
        const defaultKYCStructure = [
          {
            id: "section-1",
            name: "KYC Documents",
            documents: [
              { id: "doc-1-1", name: "Photo 4 each (A & C)", files: [] },
              { id: "doc-1-2", name: "PAN Self attested - A & C", files: [] },
              { id: "doc-1-3", name: "Aadhar - self attested - A & C", files: [] },
              { id: "doc-1-4", name: "Address Proof (Resident & Shop/Company)", files: [] },
              { id: "doc-1-5", name: "Shop Act/Company Registration/Company PAN", files: [] },
              { id: "doc-1-6", name: "Bank statement last 12 months (CA and SA)", files: [] },
              { id: "doc-1-7", name: "GST/Trade/Professional Certificate", files: [] },
              { id: "doc-1-8", name: "Udyam Registration/Certificate", files: [] },
              { id: "doc-1-9", name: "ITR last 3 years (Computation / P&L / Balance Sheet)", files: [] },
              { id: "doc-1-10", name: "Marriage Certificate (if required)", files: [] },
              { id: "doc-1-11", name: "Partnership Deed (if required)", files: [] },
              { id: "doc-1-12", name: "MOA & AOA Company Registration", files: [] },
              { id: "doc-1-13", name: "Form 26AS Last 3 Years", files: [] },
            ],
          },
        ];

        if (
          Array.isArray(caseData.documentSections) &&
          caseData.documentSections.length > 0
        ) {
          const totalFiles = caseData.documentSections.reduce(
            (sum, s) =>
              sum +
              (Array.isArray(s.documents)
                ? s.documents.reduce(
                    (dsum, d) =>
                      dsum + (Array.isArray(d.files) ? d.files.length : 0),
                    0
                  )
                : 0),
            0
          );

          if (totalFiles === 0) setDocumentSections(defaultKYCStructure);
          else setDocumentSections(caseData.documentSections);
        } else setDocumentSections(defaultKYCStructure);
      })
      .catch((err) => {
        console.error("❌ Unable to load case:", err);
        alert("Unable to load case");
      });
  }, [id, isPublic, navigate]);

  /* -------------------------------------------------------------
     ✅ File Upload & Delete
  ------------------------------------------------------------- */
  const handleFileUpload = (files, sectionIndex, docIndex) => {
    const fileList = Array.from(files);
    setDocumentSections((prev) => {
      const updated = [...prev];
      const doc = updated[sectionIndex].documents[docIndex];
      const newFiles = fileList.map((file) => ({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        file,
        filename: file.name,
        type: file.type,
        size: file.size,
        uploadDate: new Date().toISOString(),
        isUploaded: false,
        isActive: true,
        isDeleted: false,
      }));
      doc.files = [...doc.files, ...newFiles];
      return updated;
    });
  };

  const removeFile = (sectionIndex, docIndex, fileIndex) => {
    setDocumentSections((prev) => {
      const updated = [...prev];
      const fileToRemove =
        updated[sectionIndex]?.documents?.[docIndex]?.files?.[fileIndex];
      if (!fileToRemove) return prev;
      const identifier =
        fileToRemove.filename ||
        fileToRemove.name ||
        fileToRemove.fileUrl ||
        fileToRemove.id;
      if (identifier) setFilesToDelete((prevDel) => [...prevDel, identifier]);
      updated[sectionIndex].documents[docIndex].files[fileIndex] = {
        ...fileToRemove,
        isDeleted: true,
        isActive: false,
      };
      return updated;
    });
  };

  /* -------------------------------------------------------------
     ✅ Submit Form
  ------------------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fd = new FormData();

      const payload = {
        ...form,
        assignedTo:
          form.assignedTo && typeof form.assignedTo === "object"
            ? form.assignedTo._id || form.assignedTo.id || ""
            : form.assignedTo || "",
        channelPartner:
          form.channelPartner && typeof form.channelPartner === "object"
            ? form.channelPartner._id || form.channelPartner.id || ""
            : form.channelPartner || "",
      };

      for (const key in payload) {
        if (
          payload[key] !== undefined &&
          payload[key] !== null &&
          key !== "documentSections"
        ) {
          fd.append(key, payload[key]);
        }
      }

      if (filesToDelete.length > 0)
        fd.append("filesToDelete", JSON.stringify(filesToDelete));
      fd.append("documentSections", JSON.stringify(documentSections));

      documentSections.forEach((section, sectionIndex) => {
        section.documents.forEach((doc, docIndex) => {
          doc.files.forEach((fileObj) => {
            if (fileObj.file && !fileObj.isUploaded && !fileObj.isDeleted) {
              fd.append("documents", fileObj.file);
              fd.append("documents_sectionIndex", sectionIndex.toString());
              fd.append("documents_docIndex", docIndex.toString());
              fd.append("documents_docId", doc.id);
            }
          });
        });
      });

      const url = isPublic ? `/cases/${id}/public` : `/cases/${id}`;
      const response = await API.put(url, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data?.documentSections)
        setDocumentSections(response.data.documentSections);

      showEnhancedSuccess();
      setFilesToDelete([]);
    } catch (err) {
      console.error("❌ Submit failed:", err);
      alert(err.response?.data?.message || "Failed to submit case");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔹 Your existing UI & JSX form rendering remains unchanged below
}
