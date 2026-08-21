use typst::Library;
use typst::LibraryExt;
use typst::World;
use typst::diag::{FileError, FileResult};
use typst::foundations::Datetime;
use typst::syntax::{FileId, Source};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;

pub struct MinimalWorld {
    library: LazyHash<Library>,
    book: LazyHash<FontBook>,
    fonts: Vec<Font>,
    source: Source,
}

impl MinimalWorld {
    pub fn new(source_text: String) -> Self {
        let mut db = fontdb::Database::new();
        db.load_system_fonts();

        let mut fonts = Vec::new();
        for face in db.faces() {
            if let fontdb::Source::File(ref path) = face.source {
                if let Ok(bytes) = std::fs::read(path) {
                    // In typst 0.12+, Bytes can be created from Vec<u8> via typst::foundations::Bytes::new(bytes)
                    // Or bytes.into() if we use bytes: Vec<u8>
                    if let Some(font) = Font::new(typst::foundations::Bytes::new(bytes), face.index)
                    {
                        fonts.push(font);
                    }
                }
            }
        }

        let book = FontBook::from_fonts(&fonts);

        Self {
            library: LazyHash::new(Library::builder().build()),
            book: LazyHash::new(book),
            fonts,
            source: Source::detached(source_text),
        }
    }
}

impl World for MinimalWorld {
    fn library(&self) -> &LazyHash<Library> {
        &self.library
    }

    fn book(&self) -> &LazyHash<FontBook> {
        &self.book
    }

    fn main(&self) -> FileId {
        self.source.id()
    }

    fn source(&self, id: FileId) -> FileResult<Source> {
        if id == self.source.id() {
            Ok(self.source.clone())
        } else {
            // as_rootless_path is deprecated, but we just want a path
            let path_str = id.vpath().get_without_slash();
            Err(FileError::NotFound(std::path::PathBuf::from(path_str)))
        }
    }

    fn file(&self, id: FileId) -> FileResult<typst::foundations::Bytes> {
        let path_str = id.vpath().get_without_slash();
        Err(FileError::NotFound(std::path::PathBuf::from(path_str)))
    }

    fn font(&self, index: usize) -> Option<Font> {
        self.fonts.get(index).cloned()
    }

    fn today(&self, _offset: Option<typst::foundations::Duration>) -> Option<Datetime> {
        None
    }
}
