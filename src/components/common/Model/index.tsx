import React from "react";
import Modal from "react-bootstrap/Modal";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export interface Props {
  open: boolean;
  children: React.ReactNode;
  title: string;
  onClose?: () => any;
}
export default function ModelPopUp({ open, title, children, onClose }: Props) {
  return (
    <>
      <Modal
        show={open}
        onHide={onClose}
        className="w-screen"
        dialogClassName="w-screen"
      >
        <Modal.Header className="gap-3">
          <Modal.Title className="font-semibold text-lg">{title}</Modal.Title>
          <div>
            <button onClick={onClose} className="opacity-40">
              <FontAwesomeIcon icon={faXmark} fontSize={20} />
            </button>
          </div>
        </Modal.Header>
        <Modal.Body>{children}</Modal.Body>
      </Modal>
    </>
  );
}
